from typing import Dict, Any, List, Optional, Callable
import requests
import base64
from ..base import BaseConnector
import logging
from urllib.parse import urlparse
from django.utils import timezone
from datetime import datetime
from data.models import Sprint, WorkItem, PullRequest, PullRequestStatus
from users.resolver import UserResolver
from etl.transformers import ComplianceEngine

logger = logging.getLogger(__name__)

class AzureDevOpsConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        # Strip API key of any whitespace which typically causes 401s
        if self.api_key:
            self.api_key = self.api_key.strip()
            
        self.organization = None
        self.project_name = None
        self._parse_config()

    def _parse_config(self):
        """
        Parse base_url to extract organization and project.
        Supports:
        - https://dev.azure.com/{org}
        - https://dev.azure.com/{org}/{project}
        - https://{org}.visualstudio.com
        - https://{org}.visualstudio.com/{project}
        """
        if not self.base_url:
            return

        parsed = urlparse(self.base_url)
        path_parts = [p for p in parsed.path.strip('/').split('/') if p]

        # Handle dev.azure.com/{org}
        if 'dev.azure.com' in parsed.netloc:
            if len(path_parts) >= 1:
                self.organization = path_parts[0]
            if len(path_parts) >= 2:
                self.project_name = path_parts[1]
        
        # Handle {org}.visualstudio.com
        elif 'visualstudio.com' in parsed.netloc:
            self.organization = parsed.netloc.split('.')[0]
            if len(path_parts) >= 1:
                self.project_name = path_parts[0]

        # Allow override from config (Workspace ID field in UI)
        if self.config.get('workspace_id'):
            self.project_name = self.config.get('workspace_id')

        # Reconstruct base_url to be org level for consistency
        if self.organization:
            if 'dev.azure.com' in parsed.netloc:
                self.api_base = f"https://dev.azure.com/{self.organization}"
            else:
                self.api_base = f"https://{self.organization}.visualstudio.com"
        else:
            self.api_base = self.base_url.rstrip('/')

    def _get_auth_header(self) -> Dict[str, str]:
        """
        ADO uses Basic Auth with PAT (empty username, PAT as password).
        """
        if not self.api_key:
             return {}
        # Basic Auth: base64(username:password) -> base64(:PAT)
        pat_b64 = base64.b64encode(f":{self.api_key}".encode()).decode()
        return {
            'Authorization': f'Basic {pat_b64}',
            'Content-Type': 'application/json'
        }

    def test_connection(self) -> bool:
        """
        Verify ADO connection.
        If project is specified, verify access to that project.
        Otherwise, verify access to list projects.
        """
        if not self.api_base or not self.api_key:
            raise ValueError("Base URL and Personal Access Token (PAT) are required")
        
        headers = self._get_auth_header()
        
        if self.project_name:
            url = f"{self.api_base}/_apis/projects/{self.project_name}?api-version=6.0"
        else:
            url = f"{self.api_base}/_apis/projects?api-version=6.0"
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return True
            else:
                # Raise specific error for UI to display
                msg = f"ADO Connection Failed: {response.status_code}"
                try:
                    error_data = response.json()
                    if 'message' in error_data:
                        msg += f" - {error_data['message']}"
                    elif 'typeKey' in error_data:
                         msg += f" - {error_data.get('typeKey')}"
                except:
                    msg += f" - {response.text[:100]}"
                raise Exception(msg)
        except Exception as e:
            logger.error(f"ADO Connection Error: {e}")
            raise e

    def sync(self, tenant_id: int, source_id: int, progress_callback: Optional[Callable[[int, str], None]] = None) -> Dict[str, Any]:
        """
        Fetch Work Items, Sprints, and PRs.
        """
        headers = self._get_auth_header()
        item_count = 0

        projects_to_sync = []
        
        # 1. Determine Projects
        if self.project_name:
            projects_to_sync.append({'name': self.project_name})
        else:
            # Fetch all projects
            url = f"{self.api_base}/_apis/projects?api-version=6.0"
            resp = requests.get(url, headers=headers)
            if resp.status_code != 200:
                 raise Exception(f"Failed to fetch projects: {resp.text}")
            projects_to_sync = resp.json().get('value', [])

        total_projects = len(projects_to_sync)

        for i, project in enumerate(projects_to_sync):
            p_name = project['name']
            if progress_callback:
                progress_callback(int((i/total_projects)*10), f"Syncing Project: {p_name}...")
            
            # 2. Sync Sprints (Iterations)
            self._sync_sprints(p_name, headers)

            # 3. Sync Work Items
            count = self._sync_work_items(p_name, source_id, headers)
            item_count += count
            
            # 4. Sync Pull Requests
            self._sync_pull_requests(p_name, source_id, headers)
            
        return {'item_count': item_count}

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """
        Parse ADO dates which may or may not have fractional seconds.
        Example: 2025-06-29T09:27:52Z or 2025-06-29T09:27:52.123Z
        """
        if not date_str:
            return None
        try:
            # Replace Z with +00:00 for fromisoformat compatibility in older python if needed, 
            # but mainly to ensure UTC awareness.
            clean_str = date_str.replace('Z', '+00:00')
            return datetime.fromisoformat(clean_str)
        except ValueError:
            # Fallback for formats not handled by fromisoformat (e.g. slight variations)
            # though fromisoformat is quite robust for ISO8601
            try:
                # Try format with fractional seconds
                return timezone.make_aware(datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S.%fZ"))
            except ValueError:
                try:
                    # Try format without fractional seconds
                    return timezone.make_aware(datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ"))
                except ValueError:
                    logger.warning(f"Could not parse date: {date_str}")
                    return None

    def _sync_sprints(self, project_name: str, headers: Dict):
        """
        Fetch and save Iterations as Sprints.
        Using teamsettings/iterations to get dates.
        Note: requires Team context, often 'Project Name Team'. 
        Fallback to project classifications if team api fails.
        For MVP, trying default project team.
        """
        # Default team is usually named same as project + " Team"
        team_name = f"{project_name} Team"
        # Accessing project's default team iterations
        # GET https://dev.azure.com/{organization}/{project}/{team}/_apis/work/teamsettings/iterations?api-version=6.0
        
        url = f"{self.api_base}/{project_name}/{team_name}/_apis/work/teamsettings/iterations?api-version=6.0"
        
        try:
            resp = requests.get(url, headers=headers)
            # If default team not found, might need to list teams. 
            # Ignoring specific team logic for now, if 404/400 we skip or try just project level (which doesn't always show dates)
            if resp.status_code == 200:
                iterations = resp.json().get('value', [])
                for it in iterations:
                    name = it['name']
                    it_id = it['id']
                    path = it['path']
                    
                    attributes = it.get('attributes', {})
                    s_start = self._parse_date(attributes.get('startDate'))
                    s_end = self._parse_date(attributes.get('finishDate'))

                    # Status logic - Only timed iterations are active/completed
                    now = timezone.now()
                    if not s_start or not s_end:
                         status = 'backlog'
                    elif now > s_end:
                         status = 'completed'
                    elif now < s_start:
                         status = 'planned'
                    else:
                         status = 'active'

                    Sprint.objects.update_or_create(
                        external_id=str(it_id),
                        defaults={
                            'name': name,
                            'start_date': s_start,
                            'end_date': s_end,
                            'status': status
                        }
                    )
        except Exception as e:
            logger.warning(f"Failed to sync sprints for {project_name}: {e}")

    def _sync_work_items(self, project_name: str, source_id: int, headers: Dict) -> int:
        """
        Fetch all work items via WIQL and sync.
        """
        wiql_url = f"{self.api_base}/{project_name}/_apis/wit/wiql?api-version=6.0"
        query = {
            "query": f"Select [System.Id] From WorkItems Where [System.TeamProject] = '{project_name}'"
        }
        
        wiql_resp = requests.post(wiql_url, headers=headers, json=query)
        if wiql_resp.status_code != 200:
            logger.error(f"WIQL failed for {project_name}: {wiql_resp.text}")
            return 0
            
        work_items = wiql_resp.json().get('workItems', [])
        ids = [str(wi['id']) for wi in work_items]
        
        if not ids:
            return 0
            
        # Chunk requests (max 200 per call)
        chunk_size = 200
        count = 0
        
        for i in range(0, len(ids), chunk_size):
            chunk = ids[i:i + chunk_size]
            ids_str = ",".join(chunk)
            # Remove the &fields= parameter so ADO returns all custom fields for compliance checking
            details_url = f"{self.api_base}/{project_name}/_apis/wit/workitems?ids={ids_str}&api-version=6.0"
            
            d_resp = requests.get(details_url, headers=headers)
            if d_resp.status_code == 200:
                items = d_resp.json().get('value', [])
                for item in items:
                    self._process_work_item(item, source_id)
                    count += 1
        return count

    def _process_work_item(self, item: Dict, source_id: int):
        fields = item.get('fields', {})
        external_id = str(item.get('id'))
        
        title = fields.get('System.Title', 'Untitled')
        description = fields.get('System.Description', '')
        item_type = fields.get('System.WorkItemType', 'Task').lower()
        state = fields.get('System.State', 'New')
        
        # Dates from ADO fields
        started_at = self._parse_date(fields.get('Microsoft.VSTS.Common.ActivatedDate'))
        resolved_at = self._parse_date(fields.get('Microsoft.VSTS.Common.ResolvedDate'))
        
        # Determine status category
        state_lower = state.lower()
        if state_lower in ['done', 'closed', 'completed', 'resolved']:
            status_category = 'done'
            if not resolved_at:
                resolved_at = timezone.now() # Fallback
        elif state_lower in ['new', 'to do', 'proposed']:
            status_category = 'todo'
            resolved_at = None
        else:
            status_category = 'in_progress'
            resolved_at = None
            
        # Priority
        prio = str(fields.get('Microsoft.VSTS.Common.Priority', '3'))
        
        # User resolving
        assigned_to = fields.get('System.AssignedTo', {}) # usually dict {displayName, uniqueName}
        assignee_email = assigned_to.get('uniqueName') if isinstance(assigned_to, dict) else None
        if assignee_email:
             # ADO emails might be diff, check format
             pass
        
        resolved_assignee = UserResolver.resolve_by_identity('azure_devops', assignee_email)
        
        # Dates
        created_at = self._parse_date(fields.get('System.CreatedDate')) or timezone.now()
        updated_at = self._parse_date(fields.get('System.ChangedDate')) or timezone.now()

        # Link to Sprint (Iteration)
        # IterationPath looks like "Project\\Iteration 1"
        iteration_path = fields.get('System.IterationPath')
        sprint_obj = None
        if iteration_path and '\\' in iteration_path:
            # Try to match by name (imperfect but viable MVP)
            parts = iteration_path.split('\\')
            if len(parts) > 1:
                sprint_name = parts[-1]
                sprint_obj = Sprint.objects.filter(name=sprint_name).first()
                    
        # If still no sprint and it's resolved/started, map to the most recently completed/active sprint
        if not sprint_obj and (started_at or resolved_at):
            # We don't have project_id on Sprint, so grab the latest active/completed sprint for this data source's timeline
            sprint_obj = Sprint.objects.filter(
                status__in=['active', 'completed']
            ).order_by('-end_date').first()

        # Extract DMT Compliance Custom Fields from ADO
        
        # 1. AC Quality
        ac_quality_val = fields.get('Custom.ACQuality')
        ac_quality_db = ''
        if ac_quality_val:
            ac_quality_lower = str(ac_quality_val).strip().lower()
            if ac_quality_lower == 'final': ac_quality_db = 'final'
            elif ac_quality_lower == 'testable': ac_quality_db = 'testable'
            elif ac_quality_lower == 'incomplete': ac_quality_db = 'incomplete'
            
        # 2. Unit Testing Status
        unit_testing_val = fields.get('Custom.UnitTestingStatus')
        unit_testing_db = ''
        if unit_testing_val:
            raw_val = str(unit_testing_val).strip().lower()
            if raw_val == 'not started': unit_testing_db = 'not_started'
            elif raw_val == 'in progress': unit_testing_db = 'in_progress'
            elif raw_val == 'done': unit_testing_db = 'done'
            elif raw_val == 'exception approved': unit_testing_db = 'exception_approved'
            
        # 3. Reviewer DMT Signoff (Typically a boolean or "Y"/"N" string in ADO setup)
        signoff_val = fields.get('Custom.ReviewerDMTSignoff')
        reviewer_signoff = False
        if signoff_val:
            if isinstance(signoff_val, bool):
                reviewer_signoff = signoff_val
            elif isinstance(signoff_val, str) and signoff_val.strip().upper() == 'Y':
                reviewer_signoff = True
                
        # 4. Story Points
        story_points_val = fields.get('Custom.StoryPoint')
        story_points = None
        if story_points_val is not None:
             try:
                 story_points = float(story_points_val)
             except (ValueError, TypeError):
                 pass

        # Prepare for DB
        work_item_data = {
            'source_config_id': source_id,
            'external_id': external_id,
            'title': title,
            'description': description,
            'item_type': item_type,
            'status': state,
            'status_category': status_category,
            'priority': prio,
            'story_points': story_points,
            'creator_email': fields.get('System.CreatedBy', {}).get('uniqueName') if isinstance(fields.get('System.CreatedBy'), dict) else None,
            'assignee_email': assignee_email,
            'assignee_name': assigned_to.get('displayName') if isinstance(assigned_to, dict) else None,
            'created_at': created_at,
            'updated_at': updated_at,
            'started_at': started_at,
            'resolved_at': resolved_at,
            'raw_source_data': item,
            'ac_quality': ac_quality_db,
            'unit_testing_status': unit_testing_db,
            'reviewer_dmt_signoff': reviewer_signoff,
        }

        # Compliance
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

    def _sync_pull_requests(self, project_name: str, source_id: int, headers: Dict):
        """
        Fetch Git Repos -> Pull Requests
        """
        # Get Repos
        repos_url = f"{self.api_base}/{project_name}/_apis/git/repositories?api-version=6.0"
        repos_resp = requests.get(repos_url, headers=headers)
        if repos_resp.status_code != 200:
            return 
            
        repos = repos_resp.json().get('value', [])
        for repo in repos:
            repo_id = repo['id']
            repo_name = repo['name']
            
            # Get PRs (Active and Completed)
            # searchCriteria.status=all 
            prs_url = f"{self.api_base}/{project_name}/_apis/git/repositories/{repo_id}/pullrequests?searchCriteria.status=all&api-version=6.0"
            prs_resp = requests.get(prs_url, headers=headers)
            if prs_resp.status_code == 200:
                prs = prs_resp.json().get('value', [])
                for pr in prs:
                    self._process_pr(pr, repo_name, source_id)

    def _process_pr(self, pr: Dict, repo_name: str, source_id: int):
        pr_id = str(pr['pullRequestId'])
        title = pr.get('title', '')
        status = pr.get('status') # active, completed, abandoned
        
        # Identify creator
        created_by = pr.get('createdBy', {})
        email = created_by.get('uniqueName')
        resolved_author = UserResolver.resolve_by_identity('azure_devops', email)
        
        # Dates
        created_at = self._parse_date(pr.get('creationDate')) or timezone.now()
        
        closed_date = pr.get('closedDate')
        merged_at = None
        updated_at = created_at
        
        if status == 'completed' and closed_date:
             merged_at = self._parse_date(closed_date)
             updated_at = merged_at or timezone.now()
             
        # Source/Target Refs
        source_ref = pr.get('sourceRefName', '').replace('refs/heads/', '')
        target_ref = pr.get('targetRefName', '').replace('refs/heads/', '')
        
        PullRequest.objects.update_or_create(
            external_id=pr_id,
            source_config_id=source_id,
            defaults={
                'title': title,
                'author_email': email,
                'resolved_author': resolved_author,
                'status': status,
                'repository_name': repo_name,
                'source_branch': source_ref,
                'target_branch': target_ref,
                'created_at': created_at,
                'updated_at': updated_at,
                'merged_at': merged_at
            }
        )
