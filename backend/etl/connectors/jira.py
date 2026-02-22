from typing import Dict, Any, List, Optional, Callable
import requests
import base64
import re # Added for sprint ID extraction
from ..base import BaseConnector
from data.models import WorkItem, Sprint # Modified: Added Sprint
from django.utils import timezone
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class JiraConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.email = config.get('username', '')
        self.api_token = config.get('api_token', '') or config.get('api_key', '')

    def _get_auth_header(self) -> Dict[str, str]:
        """
        Jira Cloud uses Basic Auth with Email and API Token.
        """
        if not self.email or not self.api_token:
            return {}
        
        auth_str = f"{self.email}:{self.api_token}"
        auth_b64 = base64.b64encode(auth_str.encode()).decode()
        return {
            'Authorization': f'Basic {auth_b64}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

    def test_connection(self) -> bool:
        """
        Verify Jira connection by fetching current user info.
        """
        if not self.base_url:
            raise ValueError("Base URL is required for Jira")
            
        url = f"{self.base_url.rstrip('/')}/rest/api/3/myself"
        headers = self._get_auth_header()
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return True
            else:
                raise Exception(f"Jira Connection Failed: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Jira Connection Error: {e}")
            raise e

    def sync(self, tenant_id: int, source_id: int, progress_callback: Optional[Callable[[int, str], None]] = None) -> Dict[str, Any]:
        """
        Fetch issues from Jira using JQL and sync to WorkItem model.
        """
        headers = self._get_auth_header()
        item_count = 0
        
        def report(pct, msg):
            if progress_callback:
                progress_callback(pct, msg)

        # Build JQL
        # workspace_id in SourceConfiguration can be used for Jira Project Key
        project_key = self.config.get('workspace_id')
        jql = f"project = '{project_key}'" if project_key else "order by updated desc"
        
        report(10, f"Starting Jira sync with JQL: {jql}")
        
        # 0. Sync Sprints first
        report(15, "Discovering Jira Agile boards and Sprints...")
        sprint_map = {} # external_id -> Sprint object
        try:
            boards_url = f"{self.base_url.rstrip('/')}/rest/agile/1.0/board"
            boards_params = {'projectKeyOrId': project_key} if project_key else {}
            boards_resp = requests.get(boards_url, headers=headers, params=boards_params)
            if boards_resp.status_code == 200:
                boards = boards_resp.json().get('values', [])
                for board in boards:
                    board_id = board['id']
                    sprints_url = f"{self.base_url.rstrip('/')}/rest/agile/1.0/board/{board_id}/sprint"
                    sprints_resp = requests.get(sprints_url, headers=headers)
                    if sprints_resp.status_code == 200:
                        sprints = sprints_resp.json().get('values', [])
                        for s in sprints:
                            s_start = self._parse_date(s.get('startDate'))
                            s_end = self._parse_date(s.get('endDate'))
                            s_comp = self._parse_date(s.get('completeDate'))
                            
                            sprint_ext_id = f"jira_sprint_{s['id']}"
                            sprint_obj, _ = Sprint.objects.update_or_create(
                                external_id=sprint_ext_id,
                                defaults={
                                    'name': s['name'],
                                    'start_date': s_start,
                                    'end_date': s_end,
                                    'completed_at': s_comp,
                                    'status': s['state'] # active, closed, future
                                }
                            )
                            sprint_map[str(s['id'])] = sprint_obj
        except Exception as e:
            logger.warning(f"Failed to sync Jira sprints: {e}")
        
        batch_size = 50
        start_at = 0
        total = 1 # Initial value to enter loop
        
        while start_at < total:
            url = f"{self.base_url.rstrip('/')}/rest/api/3/search"
            params = {
                'jql': jql,
                'startAt': start_at,
                'maxResults': batch_size,
                'fields': 'summary,description,status,priority,issuetype,creator,assignee,created,updated,resolutiondate',
                'expand': 'changelog'
            }
            
            resp = requests.get(url, headers=headers, params=params)
            if resp.status_code != 200:
                raise Exception(f"Failed to search Jira issues: {resp.text}")
            
            data = resp.json()
            issues = data.get('issues', [])
            total = data.get('total', 0)
            
            if not issues:
                break
                
            for issue in issues:
                self._sync_issue(issue, source_id, sprint_map)
                item_count += 1
            
            start_at += len(issues)
            pct = 10 + int((start_at / total) * 80) if total > 0 else 90
            report(min(pct, 95), f"Processed {start_at}/{total} Jira issues...")

        report(100, f"Sync complete. Processed {item_count} items.")
        return {'item_count': item_count}

    def _sync_issue(self, issue: Dict[str, Any], source_id: int, sprint_map: Dict[str, Sprint] = None): # Modified: Added sprint_map parameter
        """
        Map and save a single Jira issue to the WorkItem model.
        """
        from users.resolver import UserResolver
        from etl.transformers import ComplianceEngine, TaskHistoryParser

        external_id = issue['key']
        fields = issue.get('fields', {})
        
        # Parse timestamps
        created_at = self._parse_date(fields.get('created'))
        updated_at = self._parse_date(fields.get('updated'))
        resolved_at = self._parse_date(fields.get('resolutiondate'))
        
        # Parse cycle time from history
        changelog = issue.get('changelog', {}).get('histories', [])
        started_at = TaskHistoryParser.extract_started_at(changelog, 'jira')

        # Status and Category
        # Jira statusCategory: new, indeterminate, done
        raw_status = fields.get('status', {}).get('name', 'Open')
        category_key = fields.get('status', {}).get('statusCategory', {}).get('key', 'new')
        
        category_map = {
            'new': 'todo',
            'indeterminate': 'in_progress',
            'done': 'done'
        }
        status_category = category_map.get(category_key, 'todo')
        
        priority = fields.get('priority', {}).get('name', 'Medium')
        issue_type = fields.get('issuetype', {}).get('name', 'Task')
        
        description = self._flatten_adf(fields.get('description'))
        
        assignee_email = fields.get('assignee', {}).get('emailAddress') if fields.get('assignee') else None
        resolved_assignee = UserResolver.resolve_by_identity('jira', assignee_email)

        # Extract sprint from custom fields
        sprint_obj = None
        if sprint_map:
            # Look for common sprint field patterns
            for key, value in fields.items():
                if key.startswith('customfield_') and value:
                    # Jira sprints can be a list of strings or dicts depending on API version/config
                    if isinstance(value, list) and len(value) > 0:
                        s_val = value[0]
                        sid = None
                        if isinstance(s_val, dict):
                            sid = str(s_val.get('id'))
                        elif isinstance(s_val, str) and 'id=' in s_val:
                            # Sometimes it's a string like "com.atlassian.greenhopper.service.sprint.Sprint@...[id=1,name=...]"
                            match = re.search(r'id=(\d+)', s_val)
                            if match:
                                sid = match.group(1)
                        
                        if sid and sid in sprint_map:
                            sprint_obj = sprint_map[sid]
                            break

        # Prepare data for model and compliance check
        work_item_data = {
            'source_config_id': source_id,
            'external_id': external_id,
            'title': fields.get('summary', 'Untitled'),
            'description': description,
            'item_type': issue_type.lower(),
            'status': raw_status,
            'status_category': status_category,
            'priority': priority.lower(),
            'creator_email': fields.get('creator', {}).get('emailAddress'),
            'assignee_email': assignee_email,
            'assignee_name': fields.get('assignee', {}).get('displayName') if fields.get('assignee') else None,
            'created_at': created_at,
            'updated_at': updated_at,
            'started_at': started_at,
            'resolved_at': resolved_at,
            'raw_source_data': issue,
        }

        # Run non-blocking compliance check
        threshold = self.config.get('coverage_threshold', 80.0)
        is_compliant, compliance_failures = ComplianceEngine.check_compliance(work_item_data, coverage_threshold=threshold)
        work_item_data['dmt_compliant'] = is_compliant
        work_item_data['compliance_failures'] = compliance_failures

        WorkItem.objects.update_or_create(
            source_config_id=source_id,
            external_id=external_id,
            defaults={
                **work_item_data,
                'resolved_assignee': resolved_assignee,
                'sprint': sprint_obj
            }
        )

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        if not date_str:
            return None
        try:
            # Jira usually returns "2024-02-14T10:30:00.000+0000"
            # timezone.parse_datetime handles ISO format well
            from django.utils.dateparse import parse_datetime
            return parse_datetime(date_str)
        except Exception:
            return None

    def _flatten_adf(self, adf: Any) -> str:
        """
        Atlassian Document Format (ADF) to plain text conversion.
        """
        if not adf:
            return ""
        if isinstance(adf, str):
            return adf
            
        texts = []
        def _extract(node):
            if isinstance(node, dict):
                if node.get('type') == 'text' and 'text' in node:
                    texts.append(node['text'].strip())
                for value in node.values():
                    _extract(value)
            elif isinstance(node, list):
                for item in node:
                    _extract(item)
                    
        _extract(adf)
        return " ".join(filter(None, texts))
