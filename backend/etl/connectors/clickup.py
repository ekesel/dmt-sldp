from typing import Dict, Any, List, Optional, Callable
import requests
from ..base import BaseConnector
from data.models import WorkItem, Sprint
from django.utils import timezone
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ClickupConnector(BaseConnector):
    def test_connection(self) -> bool:
        """
        Verify ClickUp API token by fetching user info.
        """
        if not self.api_key:
            raise ValueError("API Key is required for ClickUp")
            
        url = f"{self.base_url}/user" # https://api.clickup.com/api/v2/user
        headers = {'Authorization': self.api_key}
        
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return True
        else:
            raise Exception(f"ClickUp Connection Failed: {response.text}")

    def sync(self, tenant_id: int, source_id: int, progress_callback: Optional[Callable[[int, str], None]] = None) -> Dict[str, Any]:
        """
        Fetch workspaces, spaces, lists, and tasks from ClickUp and sync to WorkItem model.
        """
        headers = {'Authorization': self.api_key}
        item_count = 0
        
        def report(pct, msg):
            if progress_callback:
                progress_callback(pct, msg)

        # 1. Get Teams (Workspaces)
        report(25, "Fetching ClickUp workspaces...")
        teams_resp = requests.get(f"{self.base_url}/team", headers=headers)
        if teams_resp.status_code != 200:
             raise Exception(f"Failed to fetch ClickUp teams: {teams_resp.text}")
             
        teams = teams_resp.json().get('teams', [])
        if not teams:
             return {'item_count': 0}
        
        # For MVP, we sync the first team/workspace
        team = teams[0]
        team_id = team['id']
        logger.info(f"Syncing ClickUp Team: {team['name']} ({team_id})")

        # 2. Get Spaces
        report(30, f"Fetching spaces for workspace {team['name']}...")
        spaces_resp = requests.get(f"{self.base_url}/team/{team_id}/space", headers=headers)
        if spaces_resp.status_code != 200:
            raise Exception(f"Failed to fetch ClickUp spaces: {spaces_resp.text}")
        
        spaces = spaces_resp.json().get('spaces', [])
        
        all_lists = []
        sprint_lists = {} # list_id -> Sprint object

        for i, space in enumerate(spaces):
            space_id = space['id']
            report(30 + int((i/len(spaces)) * 15), f"Scanning space: {space['name']}...")
            
            # 3. Get Folders -> Lists
            folders_resp = requests.get(f"{self.base_url}/space/{space_id}/folder", headers=headers)
            if folders_resp.status_code == 200:
                folders = folders_resp.json().get('folders', [])
                print(f"Space {space['name']} has {len(folders)} folders.")
                for folder in folders:
                    # Identify Sprint folders via flag or name fallback
                    is_sprint = folder.get('is_sprint_folder', False) or 'sprint' in folder['name'].lower()
                    lists = folder.get('lists', [])
                    for lst in lists:
                        all_lists.append(lst)
                        if is_sprint:
                            # Create or update Sprint record
                            sprint_ext_id = f"clickup_sprint_{lst['id']}"
                            # ClickUp lists have start_date and due_date in ms
                            s_start = None
                            if lst.get('start_date'):
                                s_start = timezone.make_aware(datetime.fromtimestamp(int(lst['start_date']) / 1000))
                            s_end = None
                            if lst.get('due_date'):
                                s_end = timezone.make_aware(datetime.fromtimestamp(int(lst['due_date']) / 1000))
                            
                            # Determine status
                            now = timezone.now()
                            status = 'active'
                            if s_end and now > s_end:
                                status = 'completed'
                            elif s_start and now < s_start:
                                status = 'planned'

                            sprint_obj, _ = Sprint.objects.update_or_create(
                                external_id=sprint_ext_id,
                                defaults={
                                    'name': lst['name'],
                                    'start_date': s_start,
                                    'end_date': s_end,
                                    'status': status
                                }
                            )
                            sprint_lists[lst['id']] = sprint_obj
            
            # 4. Get Folderless Lists
            lists_resp = requests.get(f"{self.base_url}/space/{space_id}/list", headers=headers)
            if lists_resp.status_code == 200:
                lists = lists_resp.json().get('lists', [])
                all_lists.extend(lists)

        # 5. Get Tasks from each list
        total_lists = len(all_lists)
        for i, lst in enumerate(all_lists):
            list_id = lst['id']
            list_name = lst['name']
            
            # progress from 50 to 90
            report(50 + int((i/total_lists) * 40), f"Syncing tasks from list: {list_name}...")
            
            tasks_resp = requests.get(f"{self.base_url}/list/{list_id}/task", headers=headers)
            if tasks_resp.status_code == 200:
                tasks = tasks_resp.json().get('tasks', [])
                for task in tasks:
                    self._sync_task(task, source_id, sprint_obj=sprint_lists.get(list_id))
                    item_count += 1
        
        report(100, f"Sync complete. Processed {item_count} items.")
        return {'item_count': item_count}

    def _sync_task(self, task: Dict[str, Any], source_id: int, sprint_obj=None):
        """
        Map and save a single ClickUp task to the WorkItem model.
        """
        from users.resolver import UserResolver
        from users.resolver import UserResolver
        from etl.transformers import ComplianceEngine

        external_id = task['id']
        
        # ClickUp timestamps are in milliseconds
        created_at = timezone.make_aware(datetime.fromtimestamp(int(task['date_created']) / 1000))
        updated_at = timezone.make_aware(datetime.fromtimestamp(int(task['date_updated']) / 1000))
        
        resolved_at = None
        if task.get('date_closed'):
            resolved_at = timezone.make_aware(datetime.fromtimestamp(int(task['date_closed']) / 1000))
            
        started_at = None
        if task.get('start_date'):
            started_at = timezone.make_aware(datetime.fromtimestamp(int(task['start_date']) / 1000))

        # Status and Category
        raw_status = task.get('status', {}).get('status', 'Open')
        status_type = task.get('status', {}).get('type', 'open')
        
        # ClickUp status type mapping
        category_map = {
            'open': 'todo',
            'custom': 'in_progress',
            'unstarted': 'todo',
            'closed': 'done'
        }
        status_category = category_map.get(status_type, 'todo')
        
        priority = task.get('priority', {}).get('priority', 'normal') if task.get('priority') else 'normal'
        
        assignee_email = task.get('assignees', [{}])[0].get('email') if task.get('assignees') else None
        resolved_assignee = UserResolver.resolve_by_identity('clickup', assignee_email)

        # Prepare data for model and compliance check
        work_item_data = {
            'source_config_id': source_id,
            'external_id': external_id,
            'title': task.get('name', 'Untitled'),
            'description': task.get('description', ''),
            'item_type': 'task', # ClickUp default
            'status': raw_status,
            'status_category': status_category,
            'priority': priority,
            'creator_email': task.get('creator', {}).get('email'),
            'assignee_email': assignee_email,
            'assignee_name': task.get('assignees', [{}])[0].get('username') if task.get('assignees') else None,
            'created_at': created_at,
            'updated_at': updated_at,
            'resolved_at': resolved_at,
            'raw_source_data': task,
        }

        # Run non-blocking compliance check
        is_compliant, compliance_failures = ComplianceEngine.check_compliance(work_item_data)
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
