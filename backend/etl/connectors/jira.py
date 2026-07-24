from typing import Dict, Any, List, Optional, Callable
import requests
import base64
import re
from ..base import BaseConnector
from data.models import WorkItem, Sprint
from django.utils import timezone
from datetime import datetime
import logging
from users.resolver import UserResolver

logger = logging.getLogger(__name__)

class JiraConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.email = config.get('username', '')
        self.api_token = config.get('api_token', '') or config.get('api_key', '')

        # Extract project key from URL if workspace_id is not explicitly provided
        original_url = config.get('base_url', '')
        if not self.config.get('workspace_id') and original_url:
            match = re.search(r'/projects/([^/]+)', original_url)
            if match:
                self.config['workspace_id'] = match.group(1)

        # Extract board ID from URL if present
        if original_url:
            board_match = re.search(r'/boards/(\d+)', original_url)
            if board_match:
                self.config['board_id'] = board_match.group(1)

        # Clean base_url to be just the API root domain (scheme + netloc)
        if self.base_url:
            from urllib.parse import urlparse
            url_to_parse = self.base_url
            if not url_to_parse.startswith(('http://', 'https://')):
                url_to_parse = f"https://{url_to_parse}"
            parsed = urlparse(url_to_parse)
            if parsed.scheme and parsed.netloc:
                self.base_url = f"{parsed.scheme}://{parsed.netloc}"

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
        from django.db.models.signals import post_save
        from data.signals import work_item_telemetry_signal, notify_compliance_issue
        from data.models import WorkItem
        
        # Disconnect signals to speed up bulk database inserts and prevent flooding
        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(notify_compliance_issue, sender=WorkItem)
        
        try:
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
                board_id = self.config.get('board_id')
                if board_id:
                    boards = [{'id': int(board_id)}]
                else:
                    boards_url = f"{self.base_url.rstrip('/')}/rest/agile/1.0/board"
                    boards_params = {'projectKeyOrId': project_key} if project_key else {}
                    boards_resp = requests.get(boards_url, headers=headers, params=boards_params)
                    boards = boards_resp.json().get('values', []) if boards_resp.status_code == 200 else []
                
                for board in boards:
                    board_id_val = board['id']
                    s_start_at = 0
                    s_total = 1
                    s_max_results = 50
                    
                    while s_start_at < s_total:
                        sprints_url = f"{self.base_url.rstrip('/')}/rest/agile/1.0/board/{board_id_val}/sprint"
                        sprints_params = {
                            'startAt': s_start_at,
                            'maxResults': s_max_results
                        }
                        sprints_resp = requests.get(sprints_url, headers=headers, params=sprints_params)
                        if sprints_resp.status_code == 200:
                            sprints_data = sprints_resp.json()
                            sprints = sprints_data.get('values', [])
                            s_total = sprints_data.get('total', 0)
                            
                            if not sprints:
                                break
                                
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
                            
                            s_start_at += len(sprints)
                        else:
                            break
            except Exception as e:
                logger.warning(f"Failed to sync Jira sprints: {e}")
            
            # Dynamically build the exact list of fields to fetch to speed up search API
            config_mapping = self.config.get('field_mapping', {})
            fields_to_fetch = [
                'summary', 'description', 'status', 'priority', 'issuetype', 
                'creator', 'assignee', 'created', 'updated', 'resolutiondate',
                'project',
                'parent',             # Get subtask parent relationship fields
                'customfield_10016',  # Standard Story Points field fallback
                'customfield_10020',  # Standard Sprint field fallback
                'customfield_10403'   # Standard AI Usage (%) field fallback
            ]
            for custom_field_key in [
                'pr_link_id', 'ac_quality_id', 'reviewer_dmt_signoff_id', 
                'unit_testing_status_id', 'pm_name_id', 'tech_lead_name_id', 
                'story_points_id', 'ai_usage_id'
            ]:
                field_id = config_mapping.get(custom_field_key)
                if field_id:
                    fields_to_fetch.append(field_id)
            
            fields_str = ','.join(list(set(fields_to_fetch)))
    
            batch_size = 50
            start_at = 0
            is_last = False
            
            board_id = self.config.get('board_id')
            
            while not is_last:
                if board_id:
                    url = f"{self.base_url.rstrip('/')}/rest/agile/1.0/board/{board_id}/issue"
                else:
                    url = f"{self.base_url.rstrip('/')}/rest/api/3/search/jql"
                
                params = {
                    'startAt': start_at,
                    'maxResults': batch_size,
                    'fields': fields_str,
                    'expand': 'changelog'
                }
                if not board_id:
                    params['jql'] = jql
                
                resp = requests.get(url, headers=headers, params=params)
                if resp.status_code != 200:
                    raise Exception(f"Failed to search Jira issues: {resp.text}")
                
                data = resp.json()
                issues = data.get('issues', [])
                
                # Support both isLast boolean and total-based calculation
                is_last = data.get('isLast')
                if is_last is None:
                    total_val = data.get('total', 0)
                    is_last = (start_at + len(issues) >= total_val)
                
                if not issues:
                    break
                    
                for issue in issues:
                    self._sync_issue(issue, source_id, sprint_map)
                    item_count += 1
                
                start_at += len(issues)
                report(90, f"Processed {start_at} Jira issues...")
    
            # 1. Sync issues (already handled in loop)
            
            # Resolve parent-child subtask relationships
            self._post_sync_linking(source_id)
            
            # 2. Post-sync: Resolve multi-assignee attribution and bubble DMT fields
            self._post_sync_attribution(source_id)
    
            # 3. Post-sync: Infer assignees from PRs for unassigned work items
            self._infer_unassigned_assignees(source_id)
    
            report(100, f"Sync complete. Processed {item_count} items.")
            return {'item_count': item_count}
        finally:
            post_save.connect(work_item_telemetry_signal, sender=WorkItem)
            post_save.connect(notify_compliance_issue, sender=WorkItem)

    def _post_sync_linking(self, source_id: int):
        """
        Link JIRA subtasks to their parent stories after all issues are synced.
        """
        from data.models import WorkItem

        # Find all synced items that do not have a parent linked yet, but have parent data in JIRA fields
        broken_links = WorkItem.objects.filter(
            source_config_id=source_id,
            parent__isnull=True
        )
        
        for item in broken_links:
            raw_fields = (item.raw_source_data or {}).get('fields', {})
            parent_data = raw_fields.get('parent')
            if parent_data:
                parent_key = parent_data.get('key')
                if parent_key:
                    parent_obj = WorkItem.objects.filter(
                        source_config_id=source_id,
                        external_id=parent_key
                    ).first()
                    if parent_obj:
                        item.parent = parent_obj
                        item.save()

        # Clear compliance/violations from subtasks (compliance rules only apply to root-level parent stories)
        WorkItem.objects.filter(
            source_config_id=source_id,
            parent__isnull=False,
        ).update(
            dmt_compliant=True,
            compliance_failures=[],
            had_violations=False,
            violation_history=[]
        )

    def _infer_unassigned_assignees(self, source_id: int):
        """
        Infers assignee_email from linked Pull Requests for unassigned work items.
        """
        from data.models import WorkItem, PullRequest
        from users.resolver import UserResolver
        from tenants.models import Tenant
        from django.db import connection

        unassigned_items = WorkItem.objects.filter(
            source_config_id=source_id,
            assignee_email__isnull=True
        ).exclude(pr_links=[])

        if not unassigned_items.exists():
            return

        logger.info(f"Checking {unassigned_items.count()} unassigned items for PR-based inference...")
        tenant = Tenant.objects.filter(schema_name=connection.schema_name).first()

        for item in unassigned_items:
            for link in item.pr_links:
                # Jira PR links often contain the PR number/ID
                # Try simple match first
                pr = PullRequest.objects.filter(pr_url=link).first()
                if not pr:
                    # Try to extract ID or slug from URL
                    pr = PullRequest.objects.filter(pr_url__icontains=str(link).strip()).first()
                
                if pr and pr.author_email:
                    item.assignee_email = pr.author_email
                    item.assignee_name = pr.author_name or pr.author_email
                    item.inferred_assignee = True
                    
                    # Resolve the author to a User object
                    item.resolved_assignee = UserResolver.resolve_or_create(
                        provider='jira',
                        external_user_id=pr.author_email,
                        email=pr.author_email,
                        name=pr.author_name or pr.author_email,
                        tenant=tenant
                    )
                    item.save()
                    logger.info(f"Inferred assignee {pr.author_email} for Jira Issue {item.external_id} from PR {pr.external_id}")
                    break

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
        
        assignee_email = self.identity_resolver.resolve(fields.get('assignee', {}).get('emailAddress')) if fields.get('assignee') else None
        assignee_name = fields.get('assignee', {}).get('displayName') if fields.get('assignee') else None
        assignee_account_id = fields.get('assignee', {}).get('accountId') if fields.get('assignee') else None

        # Resolve/upsert a portal-ready User for this assignee
        from tenants.models import Tenant
        from django.db import connection
        tenant = Tenant.objects.filter(schema_name=connection.schema_name).first()
        resolved_assignee = UserResolver.resolve_or_create(
            provider='jira',
            external_user_id=assignee_account_id or assignee_email or '',
            email=assignee_email,
            name=assignee_name,
            tenant=tenant,
        )

        # Fallback assignee_email to the resolved user's email if JIRA hid the email address
        if not assignee_email and resolved_assignee and resolved_assignee.email:
            assignee_email = resolved_assignee.email

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

        # Extract DMT custom fields via config field_mapping
        config_mapping = self.config.get('field_mapping', {})

        def get_jira_cf_val(field_id):
            if not field_id:
                return None
            val = fields.get(field_id)
            if val is None:
                return None
            if isinstance(val, dict):
                return val.get('value') or val.get('name')
            if isinstance(val, list) and val:
                first = val[0]
                return (first.get('value') or first.get('name')) if isinstance(first, dict) else first
            return val

        # PR Link
        pr_link_val = get_jira_cf_val(config_mapping.get('pr_link_id'))
        jira_pr_links = []
        if pr_link_val and isinstance(pr_link_val, str):
            import re as _re
            found_urls = _re.findall(r'(https?://[^\s<",>]+)', pr_link_val)
            jira_pr_links = list(dict.fromkeys(u.rstrip('.,;)') for u in found_urls))

        # AC Quality
        ac_quality_val = get_jira_cf_val(config_mapping.get('ac_quality_id'))
        jira_ac_quality = ''
        if ac_quality_val:
            _lower = str(ac_quality_val).strip().lower()
            if _lower == 'final': jira_ac_quality = 'final'
            elif _lower == 'testable': jira_ac_quality = 'testable'
            elif _lower == 'incomplete': jira_ac_quality = 'incomplete'

        # Reviewer Signoff
        signoff_val = get_jira_cf_val(config_mapping.get('reviewer_dmt_signoff_id'))
        jira_reviewer_signoff = False
        if signoff_val is not None:
            _s = str(signoff_val).strip().lower()
            if signoff_val is True or _s in ['y', 'yes', 'true', '1']:
                jira_reviewer_signoff = True

        # Unit Testing Status
        unit_testing_val = get_jira_cf_val(config_mapping.get('unit_testing_status_id'))
        jira_unit_testing = ''
        if unit_testing_val:
            _raw = str(unit_testing_val).strip().lower()
            if _raw == 'not started': jira_unit_testing = 'not_started'
            elif _raw == 'in progress': jira_unit_testing = 'in_progress'
            elif _raw == 'done': jira_unit_testing = 'done'
            elif _raw == 'exception approved': jira_unit_testing = 'exception_approved'

        # PM Name / Tech Lead Name
        jira_pm_name, jira_pm_email_raw = self._extract_person_field(get_jira_cf_val(config_mapping.get('pm_name_id')))
        jira_pm_email = self.identity_resolver.resolve(jira_pm_email_raw) if jira_pm_email_raw else None
        jira_tl_name, jira_tl_email_raw = self._extract_person_field(get_jira_cf_val(config_mapping.get('tech_lead_name_id')))
        jira_tech_lead_email = self.identity_resolver.resolve(jira_tl_email_raw) if jira_tl_email_raw else None

        # Story Points mapping and extraction
        story_points_val = get_jira_cf_val(config_mapping.get('story_points_id'))
        if story_points_val is None:
            # Fallback to standard Jira Cloud Story Points custom field
            story_points_val = fields.get('customfield_10016')
            
        story_points = None
        if story_points_val is not None:
            try:
                story_points = float(story_points_val)
            except (ValueError, TypeError):
                pass

        # AI Usage mapping and extraction
        ai_usage_val = get_jira_cf_val(config_mapping.get('ai_usage_id'))
        if ai_usage_val is None:
            # Fallback to standard Jira AI Usage (%) custom field
            ai_usage_val = fields.get('customfield_10403')
            
        ai_usage_percent = None
        if ai_usage_val is not None:
            try:
                val = float(ai_usage_val)
                # If value is <= 1.0, assume it represents a decimal percentage (e.g. 0.8 -> 80.0)
                if val <= 1.0:
                    ai_usage_percent = val * 100.0
                else:
                    ai_usage_percent = val
            except (ValueError, TypeError):
                pass

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
            'story_points': story_points,
            'ai_usage_percent': ai_usage_percent,
            'creator_email': self.identity_resolver.resolve(fields.get('creator', {}).get('emailAddress')),
            'assignee_email': assignee_email,
            'assignee_name': assignee_name,
            'inferred_assignee': False,
            'ac_quality': jira_ac_quality,
            'unit_testing_status': jira_unit_testing,
            'reviewer_dmt_signoff': jira_reviewer_signoff,
            'pr_links': jira_pr_links,
            'pm_name': jira_pm_name,
            'pm_email': jira_pm_email,
            'tech_lead_name': jira_tl_name,
            'tech_lead_email': jira_tech_lead_email,
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

        # Track compliance history (must run before update_or_create)
        violation_tracking = self._track_violation_history(source_id, external_id, is_compliant, compliance_failures)
        work_item_data.update(violation_tracking)

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
