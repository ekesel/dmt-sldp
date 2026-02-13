import requests
from .base import BaseConnector

class JiraConnector(BaseConnector):
    def fetch_work_items(self, last_sync=None):
        # Mocking Jira API fetch and mapping
        # In production, this would use requests.get() with basic auth or OAuth
        url = f"{self.config['base_url']}/rest/api/3/search"
        # Mocked data mapping to normalized format
        return [
            {
                'external_id': 'JIRA-101',
                'title': 'Implement Auth Flow',
                'type': 'story',
                'status': 'Done',
                'created_at': '2026-02-10T10:00:00Z',
                'updated_at': '2026-02-12T15:00:00Z',
            }
        ]

    def fetch_sprints(self):
        return [
            {
                'external_id': 'SPRINT-1',
                'name': 'Pilot Sprint',
                'status': 'active',
            }
        ]

    def fetch_pull_requests(self):
        # Jira items might link to PRs in Bitbucket/GitHub
        return []

    def validate_connection(self):
        try:
            # response = requests.get(f"{self.config['base_url']}/rest/api/3/myself", auth=...)
            # return response.status_code == 200
            return True # Mock pass
        except Exception:
            return False

