import requests
import logging
from django.utils import timezone
from .base import BaseConnector

logger = logging.getLogger(__name__)

class JiraConnector(BaseConnector):
    """
    Connector for Atlassian Jira, using OAuth2 for production security.
    """
    def _get_headers(self):
        """Helper to build OAuth2 auth headers."""
        creds = self.config.get('credentials', {})
        access_token = creds.get('access_token')
        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    def refresh_access_token(self):
        """
        Refresh the OAuth2 access token using the refresh token.
        Reference: https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-google-tutorial/
        """
        creds = self.integration.credentials
        refresh_token = creds.get('refresh_token')
        client_id = creds.get('client_id')
        client_secret = creds.get('client_secret')

        if not refresh_token or not client_id:
            logger.error(f"Missing OAuth2 refresh credentials for {self.integration}")
            return False

        token_url = "https://auth.atlassian.com/oauth/token"
        payload = {
            "grant_type": "refresh_token",
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token
        }

        try:
            response = requests.post(token_url, json=payload)
            response.raise_for_status()
            data = response.json()
            
            # Update credentials
            creds['access_token'] = data['access_token']
            creds['refresh_token'] = data.get('refresh_token', refresh_token) # Might provide new refresh token
            creds['expires_at'] = (timezone.now() + timezone.timedelta(seconds=data['expires_in'])).isoformat()
            
            self.integration.credentials = creds
            self.integration.save()
            
            # Update local config for the current instance
            self.config['credentials'] = creds
            logger.info(f"Successfully refreshed Jira OAuth2 token for {self.integration}")
            return True
        except Exception as e:
            logger.error(f"Failed to refresh Jira OAuth2 token: {e}")
            return False

    def fetch_work_items(self, last_sync=None):
        """Fetch Jira issues using JQL."""
        url = f"{self.config['base_url']}/rest/api/3/search"
        headers = self._get_headers()
        
        # Simplified JQL for demonstration
        params = {
            "jql": "updated >= -1w" if not last_sync else f"updated >= '{last_sync.strftime('%Y-%m-%d %H:%M')}'",
            "maxResults": 100
        }

        try:
            response = requests.get(url, headers=headers, params=params)
            if response.status_code == 401:
                # Attempt refresh once
                if self.refresh_access_token():
                    headers = self._get_headers()
                    response = requests.get(url, headers=headers, params=params)
            
            response.raise_for_status()
            data = response.json()
            
            results = []
            for issue in data.get('issues', []):
                fields = issue['fields']
                results.append({
                    'external_id': issue['key'],
                    'title': fields['summary'],
                    'type': fields['issuetype']['name'].lower(),
                    'status': fields['status']['name'],
                    'created_at': fields['created'],
                    'updated_at': fields['updated'],
                })
            return results
        except Exception as e:
            logger.error(f"Jira issue fetch failed: {e}")
            return []

    def fetch_sprints(self):
        """Fetch Jira sprints. Requires Agile API."""
        # Typically requires a board ID to fetch sprints
        return []

    def fetch_pull_requests(self):
        """Jira links to DevInfo for PRs."""
        return []

    def validate_connection(self):
        url = f"{self.config['base_url']}/rest/api/3/myself"
        headers = self._get_headers()
        try:
            response = requests.get(url, headers=headers)
            return response.status_code == 200
        except Exception:
            return False

