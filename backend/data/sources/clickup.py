import requests
import os
from datetime import datetime

class ClickUpSource:
    BASE_URL = "https://api.clickup.com/api/v2"

    def __init__(self, integration):
        self.integration = integration
        self.api_token = integration.config.get('api_token')
        self.workspace_id = integration.config.get('workspace_id')
        self.headers = {
            "Authorization": self.api_token,
            "Content-Type": "application/json"
        }

    def fetch_lists(self, space_id):
        url = f"{self.BASE_URL}/space/{space_id}/list"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json().get('lists', [])

    def fetch_tasks(self, list_id, archived=False):
        tasks = []
        page = 0
        while True:
            url = f"{self.BASE_URL}/list/{list_id}/task?archived={str(archived).lower()}&page={page}"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            batch = data.get('tasks', [])
            tasks.extend(batch)
            if len(batch) < 100:
                break
            page += 1
        return tasks

    def normalize_task_to_workitem(self, task_data):
        """
        Maps ClickUp task to normalized WorkItem schema.
        """
        return {
            "external_id": task_data.get('id'),
            "title": task_data.get('name'),
            "description": task_data.get('description'),
            "status": task_data.get('status', {}).get('status'),
            "priority": task_data.get('priority', {}).get('priority'),
            "developer_email": task_data.get('assignees', [{}])[0].get('email') if task_data.get('assignees') else None,
            "created_at": datetime.fromtimestamp(int(task_data.get('date_created')) / 1000),
            "updated_at": datetime.fromtimestamp(int(task_data.get('date_updated')) / 1000),
            "closed_at": datetime.fromtimestamp(int(task_data.get('date_closed')) / 1000) if task_data.get('date_closed') else None,
        }

    def sync(self):
        # Implementation for higher-level sync logic
        # This will be called by the Celery task
        pass
