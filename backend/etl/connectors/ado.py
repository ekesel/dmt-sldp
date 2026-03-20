from typing import Dict, Any, List, Optional, Callable
import requests
import base64
from ..base import BaseConnector
import logging
from urllib.parse import urlparse, unquote, quote
from django.utils import timezone
from datetime import datetime
from data.models import Sprint, WorkItem, PullRequest, PullRequestStatus, PullRequestReviewer, Commit
from users.resolver import UserResolver
from etl.transformers import ComplianceEngine
from etl.analyzers.pr_diff import PRDiffAnalyzer
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
                self.organization = unquote(path_parts[0])
            if len(path_parts) >= 2:
                self.project_name = unquote(path_parts[1])
        
        # Handle {org}.visualstudio.com
        elif 'visualstudio.com' in parsed.netloc:
            self.organization = unquote(parsed.netloc.split('.')[0])
            if len(path_parts) >= 1:
                self.project_name = unquote(path_parts[0])

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
            url = f"{self.api_base}/_apis/projects/{quote(self.project_name)}?api-version=6.0"
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

    def fetch_folders(self) -> List[Dict[str, str]]:
        """
        Fetch available Teams from Azure DevOps to be used as 'Folders'.
        """
        headers = self._get_auth_header()
        teams_list = []
        
        # If project is specified, fetch teams for that project
        if self.project_name:
            url = f"{self.api_base}/_apis/projects/{quote(self.project_name)}/teams?api-version=6.0"
            try:
                resp = requests.get(url, headers=headers)
                if resp.status_code == 200:
                    teams = resp.json().get('value', [])
                    for team in teams:
                        teams_list.append({
                            'id': team['id'],
                            'name': f"{self.project_name} / {team['name']}"
                        })
            except Exception as e:
                logger.error(f"ADO Fetch Teams Error: {e}")
        else:
            # If no project specified, fetch all projects then teams
            url = f"{self.api_base}/_apis/projects?api-version=6.0"
            try:
                resp = requests.get(url, headers=headers)
                if resp.status_code == 200:
                    projects = resp.json().get('value', [])
                    for project in projects:
                        p_name = project['name']
                        t_url = f"{self.api_base}/_apis/projects/{quote(p_name)}/teams?api-version=6.0"
                        t_resp = requests.get(t_url, headers=headers)
                        if t_resp.status_code == 200:
                            teams = t_resp.json().get('value', [])
                            for team in teams:
                                teams_list.append({
                                    'id': team['id'],
                                    'name': f"{p_name} / {team['name']}"
                                })
            except Exception as e:
                logger.error(f"ADO Fetch Projects/Teams Error: {e}")
                
        return teams_list

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
            self._sync_pull_requests(p_name, source_id, headers, progress_callback)
            
        # 5. Post-sync: Infer assignees from PRs for unassigned work items
        self._infer_unassigned_assignees(source_id)

        return {'item_count': item_count}

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
                # Extract PR ID from link (ADO format: .../pullrequest/123)
                if '/pullrequest/' in str(link):
                    try:
                        pr_id = str(link).split('/pullrequest/')[-1].split('?')[0].split('#')[0]
                        # Look up PR in our DB by URL (more robust than local ID + source_id)
                        pr = PullRequest.objects.filter(pr_url__icontains=str(link).strip()).first()
                        
                        if pr and pr.author_email:
                            item.assignee_email = pr.author_email
                            item.assignee_name = pr.author_name or pr.author_email
                            item.inferred_assignee = True
                            
                            # Resolve the author to a User object
                            item.resolved_assignee = UserResolver.resolve_or_create(
                                provider='azure_devops',
                                external_user_id=pr.author_email,
                                email=pr.author_email,
                                name=pr.author_name or pr.author_email,
                                tenant=tenant
                            )
                            item.save()
                            logger.info(f"Inferred assignee {pr.author_email} for WorkItem {item.external_id} from PR {pr_id}")
                            break # Found an assignee, move to next item
                    except Exception as e:
                        logger.warning(f"Failed to infer assignee for item {item.external_id} from link {link}: {e}")

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
        We'll try the default project team first, then all other teams if that fails.
        """
        # 1. Try to get all teams first
        teams = []
        teams_url = f"{self.api_base}/_apis/projects/{quote(project_name)}/teams?api-version=6.0"
        try:
            teams_resp = requests.get(teams_url, headers=headers)
            if teams_resp.status_code == 200:
                teams = teams_resp.json().get('value', [])
        except Exception as e:
            logger.warning(f"Failed to fetch teams for {project_name}: {e}")

        # Add default team name to front of list if not already there
        default_team_name = f"{project_name} Team"
        team_names = [t['name'] for t in teams]
        if default_team_name not in team_names:
            team_names.insert(0, default_team_name)
        else:
            # Move default team to front
            team_names.remove(default_team_name)
            team_names.insert(0, default_team_name)

        synced_iteration_ids = set()

        for team_name in team_names:
            # GET https://dev.azure.com/{organization}/{project}/{team}/_apis/work/teamsettings/iterations?api-version=6.0
            url = f"{self.api_base}/{quote(project_name)}/{quote(team_name)}/_apis/work/teamsettings/iterations?api-version=6.0"
            
            try:
                resp = requests.get(url, headers=headers)
                if resp.status_code == 200:
                    iterations = resp.json().get('value', [])
                    if not iterations:
                        continue

                    for it in iterations:
                        it_id = str(it['id'])
                        if it_id in synced_iteration_ids:
                            continue
                        
                        name = it['name']
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
                            external_id=it_id,
                            defaults={
                                'name': name,
                                'start_date': s_start,
                                'end_date': s_end,
                                'status': status
                            }
                        )
                        synced_iteration_ids.add(it_id)
            except Exception as e:
                logger.warning(f"Failed to sync sprints for team {team_name} in {project_name}: {e}")

    def _sync_work_items(self, project_name: str, source_id: int, headers: Dict) -> int:
        """
        Fetch all work items via WIQL and sync.
        """
        wiql_url = f"{self.api_base}/{quote(project_name)}/_apis/wit/wiql?api-version=6.0"
        query = {
            "query": "Select [System.Id] From WorkItems"
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
            details_url = f"{self.api_base}/{quote(project_name)}/_apis/wit/workitems?ids={ids_str}&api-version=6.0"
            
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
        
        # User resolving — upsert a portal-ready User for this assignee
        assigned_to = fields.get('System.AssignedTo', {})
        assignee_email = assigned_to.get('uniqueName') if isinstance(assigned_to, dict) else None
        # Resolve identity
        assignee_email = self.identity_resolver.resolve(assignee_email)
        
        assignee_name = assigned_to.get('displayName') if isinstance(assigned_to, dict) else None
        # ADO uses descriptor as stable external ID (falls back to email)
        assignee_descriptor = assigned_to.get('descriptor') if isinstance(assigned_to, dict) else None

        from tenants.models import Tenant
        from django.db import connection
        tenant = Tenant.objects.filter(schema_name=connection.schema_name).first()
        resolved_assignee = UserResolver.resolve_or_create(
            provider='azure_devops',
            external_user_id=assignee_descriptor or assignee_email or '',
            email=assignee_email,
            name=assignee_name,
            tenant=tenant,
        )
        
        # Dates
        created_at = self._parse_date(fields.get('System.CreatedDate')) or timezone.now()
        updated_at = self._parse_date(fields.get('System.ChangedDate')) or timezone.now()

        # Link to Sprint (Iteration)
        # Attempt to match by exact IterationId first (most reliable)
        iteration_info = fields.get('System.IterationId') or item.get('id') # fallback
        sprint_obj = None
        if iteration_info:
             sprint_obj = Sprint.objects.filter(external_id=str(iteration_info)).first()
        
        # Fallback to name-based matching if ID fails or IterationPath is provided
        if not sprint_obj:
            iteration_path = fields.get('System.IterationPath')
            if iteration_path and '\\' in iteration_path:
                parts = iteration_path.split('\\')
                if len(parts) > 1:
                    sprint_name = parts[-1]
                    sprint_obj = Sprint.objects.filter(name=sprint_name).order_by('-end_date').first()
                    
        # If still no sprint and it's resolved/started, map to the most recently completed/active sprint
        if not sprint_obj and (started_at or resolved_at):
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
            
        # 3. Reviewer DMT Signoff 
        signoff_val = fields.get('Custom.ReviewerDMTSignoff') or fields.get('Custom.ReviewerDMTSSignoff')
        reviewer_signoff = False
        if signoff_val:
            if isinstance(signoff_val, bool):
                reviewer_signoff = signoff_val
            elif isinstance(signoff_val, str) and signoff_val.strip().upper() in ['Y', 'YES', 'TRUE']:
                reviewer_signoff = True
                
        # 4. Story Points (Check multiple common field names)
        story_points_val = fields.get('Microsoft.VSTS.Scheduling.StoryPoints') or \
                           fields.get('Custom.StoryPoint') or \
                           fields.get('Custom.StoryPoints') or \
                           fields.get('Microsoft.VSTS.Scheduling.Size')
        story_points = None
        if story_points_val is not None:
             try:
                 story_points = float(story_points_val)
             except (ValueError, TypeError):
                 pass

        # 5. AI Usage Percentage
        ai_usage_val = fields.get('Custom.AIUsagePercentage') or fields.get('Custom.AIUsagePercent')
        ai_usage = 0.0
        if ai_usage_val is not None:
            try:
                ai_usage = float(ai_usage_val)
            except (ValueError, TypeError):
                pass

        # 6. Coverage Percentage Change
        coverage_val = fields.get('Custom.CoveragePercentageChange') or fields.get('Custom.CoveragePercentage')
        coverage = None
        if coverage_val is not None:
            try:
                coverage = float(coverage_val)
            except (ValueError, TypeError):
                pass

        # 7. DMT Exception Logic
        dmt_exc_req = fields.get('Custom.DMTExceptionRequired')
        dmt_exception_required = False
        if dmt_exc_req:
            if isinstance(dmt_exc_req, bool):
                dmt_exception_required = dmt_exc_req
            elif str(dmt_exc_req).strip().upper() in ['Y', 'YES', 'TRUE']:
                dmt_exception_required = True
        
        dmt_exception_reason = fields.get('Custom.DMTExceptionDetails') or fields.get('Custom.DMTExceptionReason') or ""

        # 8. PR Link
        pr_link_val = fields.get('Custom.PRLink') or fields.get('Custom.PullRequestLink')
        pr_links = []
        if pr_link_val and isinstance(pr_link_val, str):
            import re
            # Extract URLs from raw text or HTML hrefs (exclude commas, brackets, spaces)
            found_urls = re.findall(r'(https?://[^\s<",>]+)', pr_link_val)
            # ADO sometimes allows weird spaced URLs, normalize them
            for u in found_urls:
                clean_url = u.strip().replace(' ', '%20')
                if clean_url not in pr_links:
                    pr_links.append(clean_url)

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
            'assignee_name': assignee_name,
            'created_at': created_at,
            'updated_at': updated_at,
            'started_at': started_at,
            'resolved_at': resolved_at,
            'raw_source_data': item,
            'ac_quality': ac_quality_db,
            'unit_testing_status': unit_testing_db,
            'reviewer_dmt_signoff': reviewer_signoff,
            'ai_usage_percent': ai_usage,
            'coverage_percent': coverage,
            'pr_links': pr_links,
            'dmt_exception_required': dmt_exception_required,
            'dmt_exception_reason': dmt_exception_reason,
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

    def _sync_pull_requests(self, project_name: str, source_id: int, headers: Dict, progress_callback: Optional[Callable[[int, str], None]] = None):
        """
        Fetch Git Repos -> Pull Requests
        """
        # Get Repos
        repos_url = f"{self.api_base}/{quote(project_name)}/_apis/git/repositories?api-version=6.0"
        repos_resp = requests.get(repos_url, headers=headers)
        if repos_resp.status_code != 200:
            return 
            
        repos = repos_resp.json().get('value', [])
        total_repos = len(repos)
        
        for i, repo in enumerate(repos):
            repo_id = repo['id']
            repo_name = repo['name']
            
            # Get PRs (Active and Completed) - use $top=1000 to get deep history
            prs_url = f"{self.api_base}/{quote(project_name)}/_apis/git/repositories/{repo_id}/pullrequests?searchCriteria.status=all&$top=1000&api-version=6.0"
            prs_resp = requests.get(prs_url, headers=headers)
            if prs_resp.status_code == 200:
                prs = prs_resp.json().get('value', [])
                total_prs = len(prs)
                for j, pr in enumerate(prs):
                    if progress_callback:
                        # Map total progress to 10-100% range (0-10% is for Work Items/Sprints)
                        abs_progress = 10 + int((i/total_repos) * 90) + int((j/total_prs) * (90/total_repos))
                        progress_callback(abs_progress, f"Analyzing PR {pr.get('pullRequestId')} in {repo_name}...")
                    try:
                        self._process_pr(pr, repo_name, repo_id, project_name, source_id, headers)
                    except Exception as e:
                        print(f"ERROR: Failed to process PR {pr.get('pullRequestId')}: {e}")
            
            # Sync Commits for this repo
            self._sync_commits(repo_name, repo_id, project_name, source_id, headers)

    def _sync_commits(self, repo_name: str, repo_id: str, project_name: str, source_id: int, headers: Dict):
        """
        Fetch commits for a specific repository.
        """
        # We fetch the top 200 commits. In a real production system, this would use pagination 
        # and date filtering based on the last sync time.
        commits_url = f"{self.api_base}/{quote(project_name)}/_apis/git/repositories/{repo_id}/commits?searchCriteria.top=200&api-version=6.0"
        resp = requests.get(commits_url, headers=headers)
        
        if resp.status_code == 200:
            commits = resp.json().get('value', [])
            for commit in commits:
                commit_id = commit.get('commitId')
                author = commit.get('author', {})
                email = author.get('email')
                name = author.get('name')
                message = commit.get('comment', '')
                date_str = author.get('date')
                
                committed_at = self._parse_date(date_str) or timezone.now()
                
                # ADO commits API doesn't always return line changes in the list view without a separate call.
                # We'll default to 0 for these unless we do deep analysis.
                additions = 0
                deletions = 0
                change_counts = commit.get('changeCounts')
                if change_counts:
                    additions = change_counts.get('Add', 0) + change_counts.get('Edit', 0)
                    deletions = change_counts.get('Delete', 0)
                    
                resolved_author = UserResolver.resolve_by_identity('azure_devops', email)
                
                Commit.objects.update_or_create(
                    external_id=commit_id,
                    source_config_id=source_id,
                    defaults={
                        'repository_name': repo_name,
                        'author_email': self.identity_resolver.resolve(email),
                        'author_name': name,
                        'resolved_author': resolved_author,
                        'message': message[:2000],  # Truncate if extremely long
                        'committed_at': committed_at,
                        'additions': additions,
                        'deletions': deletions
                    }
                )

    def _process_pr(self, pr: Dict, repo_name: str, repo_id: str, project_name: str, source_id: int, headers: Dict):
        pr_id = str(pr['pullRequestId'])
        print(f"DEBUG: Processing PR {pr_id} ({pr.get('title')})")
        title = pr.get('title', '')
        status = pr.get('status')
        
        created_by = pr.get('createdBy', {})
        email = self.identity_resolver.resolve(created_by.get('uniqueName'))
        author_name = created_by.get('displayName')
        resolved_author = UserResolver.resolve_by_identity('azure_devops', email)
        
        created_at = self._parse_date(pr.get('creationDate')) or timezone.now()
        closed_date = pr.get('closedDate')
        merged_at = None
        updated_at = created_at
        
        if status == 'completed' and closed_date:
             merged_at = self._parse_date(closed_date)
             updated_at = merged_at or timezone.now()
             
        source_ref = pr.get('sourceRefName', '').replace('refs/heads/', '')
        target_ref = pr.get('targetRefName', '').replace('refs/heads/', '')
        pr_url = f"{self.api_base}/{quote(project_name)}/_git/{quote(repo_name)}/pullrequest/{pr_id}"
        
        # --- NEW: Fetch Diff & AI Usage ---
        ai_data = None
        
        # Check if we already have analysis results for this PR to avoid redundant work
        existing_pr = PullRequest.objects.filter(external_id=pr_id, source_config_id=source_id).first()
        if existing_pr and existing_pr.diff_analyzed_at:
            # We already have results, but we might want to skip logic here
            # For now, let's skip the expensive diff fetch if we have a percent
            if existing_pr.ai_code_percent is not None:
                ai_data = {
                    'ai_lines': existing_pr.ai_generated_lines, 
                    'total_lines': existing_pr.total_changed_lines, 
                    'percent': existing_pr.ai_code_percent
                }

        if not ai_data:
            try:
                diff_text = self._get_pr_diff_text(project_name, repo_id, pr_id, headers)
                if diff_text:
                    ai_data = PRDiffAnalyzer.calculate_ai_usage(diff_text)
                    print(f"DEBUG: Analyzed ADO PR {pr_id}: {ai_data['percent']}% AI ({ai_data['ai_lines']}/{ai_data['total_lines']} lines)")
            except Exception as e:
                logger.error(f"Failed to analyze ADO PR {pr_id} diff: {e}")
                ai_data = {'ai_lines': 0, 'total_lines': 0, 'percent': 0.0}
        
        if not ai_data:
            ai_data = {'ai_lines': 0, 'total_lines': 0, 'percent': 0.0}

        pr_obj, created = PullRequest.objects.update_or_create(
            external_id=pr_id,
            source_config_id=source_id,
            defaults={
                'title': title,
                'author_email': email,
                'author_name': author_name,
                'resolved_author': resolved_author,
                'status': status,
                'repository_name': repo_name,
                'source_branch': source_ref,
                'target_branch': target_ref,
                'created_at': created_at,
                'updated_at': updated_at,
                'merged_at': merged_at,
                'pr_url': pr_url,
                'ai_code_percent': ai_data['percent'],
                'ai_generated_lines': ai_data['ai_lines'],
                'total_changed_lines': ai_data['total_lines'],
                'diff_analyzed_at': timezone.now()
            }
        )
        # --- END NEW ---
        
        reviewers = pr.get('reviewers', [])
        for reviewer in reviewers:
            rev_email = reviewer.get('uniqueName')
            if not rev_email:
                continue
                
            rev_name = reviewer.get('displayName', '')
            vote = reviewer.get('vote', 0)
            reviewed_at = updated_at if vote != 0 else None
            resolved_rev = UserResolver.resolve_by_identity('azure_devops', rev_email)
            
            PullRequestReviewer.objects.update_or_create(
                pull_request=pr_obj,
                reviewer_email=self.identity_resolver.resolve(rev_email),
                defaults={
                    'reviewer_name': rev_name,
                    'resolved_reviewer': resolved_rev,
                    'vote': vote,
                    'reviewed_at': reviewed_at
                }
            )

    def _get_pr_diff_text(self, project_name: str, repo_id: str, pr_id: str, headers: Dict) -> str:
        """
        Manually reconstructs a unified diff by comparing blobs of the latest iteration.
        """
        import difflib
        
        # 1. Get iterations - we use org-level URL if repo_id is a GUID to be more robust
        iter_url = f"{self.api_base}/_apis/git/repositories/{repo_id}/pullRequests/{pr_id}/iterations?api-version=6.0"
        resp = requests.get(iter_url, headers=headers)
        if resp.status_code != 200:
            return ""
            
        iterations = resp.json().get('value', [])
        if not iterations:
            return ""
            
        latest_iter = iterations[-1]
        iter_id = latest_iter['id']
        
        # 2. Get changes for the latest iteration - use $top=1000 to get all files
        changes_url = f"{self.api_base}/_apis/git/repositories/{repo_id}/pullRequests/{pr_id}/iterations/{iter_id}/changes?api-version=6.0&$top=1000"
        resp = requests.get(changes_url, headers=headers)
        if resp.status_code != 200:
            return ""
            
        changes = resp.json().get('changeEntries', [])
        diff_output = []
        
        MAX_FILES = 500 
        for i, change in enumerate(changes[:MAX_FILES]):
            item = change.get('item', {})
            path = item.get('path', '')
            
            if any(path.endswith(ext) for ext in ['.png', '.jpg', '.pdf', '.exe', '.bin', '.zip']):
                continue

            new_blob_id = item.get('objectId')
            old_blob_id = item.get('originalObjectId')
            
            if not new_blob_id:
                continue
                
            new_content = self._get_blob_content(project_name, repo_id, new_blob_id, headers)
            old_content = self._get_blob_content(project_name, repo_id, old_blob_id, headers) if old_blob_id else ""
            
            new_lines = new_content.splitlines(keepends=True)
            old_lines = old_content.splitlines(keepends=True)
            
            file_diff = difflib.unified_diff(
                old_lines, new_lines, 
                fromfile=f"a/{path}", tofile=f"b/{path}"
            )
            diff_text = "".join(file_diff)
            if diff_text:
                diff_output.append(diff_text)
            
        return "".join(diff_output)

    def _get_blob_content(self, project_name: str, repo_id: str, blob_id: str, headers: Dict) -> str:
        """
        Fetch raw text content of a Git blob.
        """
        url = f"{self.api_base}/_apis/git/repositories/{repo_id}/blobs/{blob_id}?api-version=6.0"
        resp = requests.get(url, headers=headers)
        if resp.status_code == 200:
            return resp.text
        return ""
