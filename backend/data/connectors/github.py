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

    def fetch_status_checks(self, pr_number):
        """
        Fetch status checks (check runs) for a specific pull request.
        We fetch the head commit SHA first.
        """
        api_key = self.integration.api_key
        headers = {
            "Authorization": f"token {api_key}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # 1. Get PR details to find the head SHA
        pr_url = f"{self.integration.base_url}/pulls/{pr_number}"
        try:
            response = requests.get(pr_url, headers=headers)
            response.raise_for_status()
            pr_data = response.json()
            head_sha = pr_data['head']['sha']
        except Exception as e:
            logger.error(f"Failed to fetch PR {pr_number} head SHA: {e}")
            return []

        # 2. Get check runs for this commit
        checks_url = f"{self.integration.base_url}/commits/{head_sha}/check-runs"
        try:
            response = requests.get(checks_url, headers=headers)
            response.raise_for_status()
            checks_data = response.json()
            
            results = []
            for run in checks_data.get('check_runs', []):
                results.append({
                    'name': run['name'],
                    'state': self._map_check_state(run['status'], run['conclusion']),
                    'target_url': run.get('html_url'),
                    'description': run.get('output', {}).get('summary') or run.get('name')
                })
            return results
        except Exception as e:
            logger.error(f"Failed to fetch check runs for {head_sha}: {e}")
            return []

    def _map_check_state(self, status, conclusion):
        if status != 'completed':
            return 'pending'
        if conclusion == 'success':
            return 'success'
        if conclusion in ['failure', 'timed_out', 'cancelled']:
            return 'failure'
        return 'error'

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
