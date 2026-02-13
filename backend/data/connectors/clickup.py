from .base import BaseConnector
from ..sources.clickup import ClickUpSource

class ClickUpConnector(BaseConnector):
    def __init__(self, integration):
        super().__init__(integration)
        self.source = ClickUpSource(integration)

    def fetch_work_items(self, last_sync=None):
        # In a real implementation, we would fetch from multiple lists/folders
        # For simplicity, we assume list_ids are in config
        list_ids = self.integration.config.get('list_ids', [])
        all_tasks = []
        for list_id in list_ids:
            tasks = self.source.fetch_tasks(list_id)
            all_tasks.extend([self.source.normalize_task_to_workitem(t) for t in tasks])
        
        # Add 'type' which isn't explicitly in the ClickUp basic normalize
        for item in all_tasks:
            item['type'] = 'task' # Default for ClickUp
            
        return all_tasks

    def fetch_sprints(self):
        # ClickUp tasks can have 'due_date' or be in 'sprints' folder
        # Mocking for now as per Jira pattern
        return []

    def fetch_pull_requests(self):
        return []

    def validate_connection(self):
        return True # Mock pass
