from typing import Dict, Any, List, Optional, Callable
import requests
from ..base import BaseConnector
from data.models import WorkItem
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
        for i, space in enumerate(spaces):
            space_id = space['id']
            # progress from 30 to 45
            report(30 + int((i/len(spaces)) * 15), f"Scanning space: {space['name']}...")
            
            # 3. Get Folders -> Lists
            folders_resp = requests.get(f"{self.base_url}/space/{space_id}/folder", headers=headers)
            if folders_resp.status_code == 200:
                folders = folders_resp.json().get('folders', [])
                for folder in folders:
                    all_lists.extend(folder.get('lists', []))
            
            # 4. Get Folderless Lists
            lists_resp = requests.get(f"{self.base_url}/space/{space_id}/list", headers=headers)
            if lists_resp.status_code == 200:
                all_lists.extend(lists_resp.json().get('lists', []))

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
                    self._sync_task(task, source_id)
                    item_count += 1
        
        report(100, f"Sync complete. Processed {item_count} items.")
        return {'item_count': item_count}

    def _sync_task(self, task: Dict[str, Any], source_id: int):
        """
        Map and save a single ClickUp task to the WorkItem model.
        """
        external_id = task['id']
        
        # ClickUp timestamps are in milliseconds
        created_at = timezone.make_aware(datetime.fromtimestamp(int(task['date_created']) / 1000))
        updated_at = timezone.make_aware(datetime.fromtimestamp(int(task['date_updated']) / 1000))
        
        resolved_at = None
        if task.get('date_closed'):
            resolved_at = timezone.make_aware(datetime.fromtimestamp(int(task['date_closed']) / 1000))

        # Basic status normalization
        raw_status = task.get('status', {}).get('status', 'Open')
        normalized_status = self.normalize_status(raw_status)
        
        priority = task.get('priority', {}).get('priority', 'normal') if task.get('priority') else 'normal'

        WorkItem.objects.update_or_create(
            external_id=external_id,
            defaults={
                'source_config_id': source_id,
                'title': task.get('name', 'Untitled'),
                'description': task.get('description', ''),
                'type': 'task', # ClickUp doesn't have a strict 'type' by default like Jira
                'status': normalized_status,
                'priority': priority,
                'creator_email': task.get('creator', {}).get('email'),
                'assignee_email': task.get('assignees', [{}])[0].get('email') if task.get('assignees') else None,
                'created_at': created_at,
                'updated_at': updated_at,
                'resolved_at': resolved_at,
            }
        )
