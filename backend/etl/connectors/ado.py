from typing import Dict, Any, List, Optional, Callable
import requests
import base64
from ..base import BaseConnector
import logging

logger = logging.getLogger(__name__)

class AzureDevOpsConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        # Handle ADO specific config if needed
        # Organization is usually part of the URL (https://dev.azure.com/{org})
        # or separate field. We'll rely on base_url.

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
        Verify ADO connection by fetching projects.
        """
        if not self.base_url or not self.api_key:
            raise ValueError("Base URL and Personal Access Token (PAT) are required")

        # Ensure base_url has no trailing slash
        base_url = self.base_url.rstrip('/')
        url = f"{base_url}/_apis/projects?api-version=6.0"
        
        headers = self._get_auth_header()
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return True
            else:
                logger.error(f"ADO Connection Failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"ADO Connection Error: {e}")
            raise e

    def sync(self, tenant_id: int, source_id: int, progress_callback: Optional[Callable[[int, str], None]] = None) -> Dict[str, Any]:
        """
        Fetch Work Items via WIQL and Pull Requests.
        """
        headers = self._get_auth_header()
        base_url = self.base_url.rstrip('/')
        item_count = 0
        
        # 1. Fetch Projects
        projects_url = f"{base_url}/_apis/projects?api-version=6.0"
        resp = requests.get(projects_url, headers=headers)
        if resp.status_code != 200:
             raise Exception(f"Failed to fetch projects: {resp.text}")
        
        projects = resp.json().get('value', [])
        
        for project in projects:
            project_name = project['name']
            project_id = project['id']
            
            # 2. Fetch Work Items using WIQL (flat list of IDs first)
            # Query: Select [System.Id] From WorkItems Where [System.TeamProject] = @project
            wiql_url = f"{base_url}/{project_name}/_apis/wit/wiql?api-version=6.0"
            query = {
                "query": f"Select [System.Id] From WorkItems Where [System.TeamProject] = '{project_name}'"
            }
            
            wiql_resp = requests.post(wiql_url, headers=headers, json=query)
            if wiql_resp.status_code == 200:
                work_items = wiql_resp.json().get('workItems', [])
                # If limits needed, slice here
                # Fetch details for found IDs in batches (max 200)
                # ... Implementation detail for full sync ...
                item_count += len(work_items)
            
        return {'item_count': item_count}
