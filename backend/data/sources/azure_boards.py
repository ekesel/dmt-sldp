import requests
from datetime import datetime

class AzureBoardsSource:
    def __init__(self, integration):
        self.integration = integration
        self.access_token = integration.config.get('access_token')
        self.organization = integration.config.get('organization')
        self.project = integration.config.get('project')
        self.base_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis"
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def execute_wiql_query(self, wiql_query):
        url = f"{self.base_url}/wit/wiql?api-version=7.1"
        payload = {"query": wiql_query}
        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json().get('workItems', [])

    def fetch_work_item_details(self, work_item_id):
        url = f"{self.base_url}/wit/workitems/{work_item_id}?api-version=7.1"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def fetch_work_items(self, last_sync=None):
        if last_sync:
            # last_sync format: '2026-02-12T15:00:00Z'
            wiql = f"SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '{self.project}' AND [System.ChangedDate] >= '{last_sync}'"
        else:
            wiql = f"SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '{self.project}'"
        
        work_item_refs = self.execute_wiql_query(wiql)
        all_details = []
        for ref in work_item_refs:
            details = self.fetch_work_item_details(ref['id'])
            all_details.append(self.normalize_workitem(details))
        return all_details

    def normalize_workitem(self, data):
        fields = data.get('fields', {})
        return {
            "external_id": str(data.get('id')),
            "title": fields.get('System.Title'),
            "description": fields.get('System.Description'),
            "status": fields.get('System.State'),
            "item_type": fields.get('System.WorkItemType'),
            "priority": str(fields.get('Microsoft.VSTS.Common.Priority', '')),
            "developer_email": fields.get('System.AssignedTo', {}).get('uniqueName'),
            "created_at": fields.get('System.CreatedDate'),
            "updated_at": fields.get('System.ChangedDate'),
            "resolved_at": fields.get('Microsoft.VSTS.Common.ResolvedDate'),
        }
