import requests
import logging
from .base import BaseConnector

logger = logging.getLogger(__name__)

class GitHubConnector(BaseConnector):
    """
    Connector for GitHub repository data, focusing on Pull Requests.
    """
    def fetch_work_items(self, last_sync=None):
        """GitHub is not a primary PM source in this architecture."""
        return []

    def fetch_sprints(self):
        """GitHub is not used for sprint management here."""
        return []

    def fetch_pull_requests(self):
        """
        Fetch pull requests from GitHub repository.
        Expected base_url: https://api.github.com/repos/{owner}/{repo}
        """
        api_key = self.integration.api_key
        headers = {
            "Authorization": f"token {api_key}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        pulls_url = f"{self.integration.base_url}/pulls?state=all&per_page=100"
        all_pulls = []
        
        while pulls_url:
            try:
                response = requests.get(pulls_url, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                for pr in data:
                    all_pulls.append({
                        'external_id': str(pr['number']),
                        'title': pr['title'],
                        'author_email': pr['user'].get('email') or f"{pr['user']['login']}@github.com",
                        'status': self._map_status(pr),
                        'repository_name': pr['base']['repo']['full_name'],
                        'source_branch': pr['head']['ref'],
                        'target_branch': pr['base']['ref'],
                        'created_at': pr['created_at'],
                        'updated_at': pr['updated_at'],
                        'merged_at': pr.get('merged_at'),
                    })
                
                # Handle pagination via Link header
                pulls_url = response.links.get('next', {}).get('url')
            except Exception as e:
                logger.error(f"GitHub PR fetch failed: {e}")
                break
                
        return all_pulls

    def _map_status(self, pr):
        if pr.get('merged_at'):
            return 'merged'
        return pr['state'] # open or closed

    def validate_connection(self):
        headers = {
            "Authorization": f"token {self.integration.api_key}",
            "Accept": "application/vnd.github.v3+json"
        }
        try:
            response = requests.get(self.integration.base_url, headers=headers)
            return response.status_code == 200
        except Exception:
            return False
