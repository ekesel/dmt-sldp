from django.core.management.base import BaseCommand
from django.utils import timezone
from unittest.mock import patch, MagicMock
from data.models import Integration
from data.connectors.jira import JiraConnector

class Command(BaseCommand):
    help = 'Verify Phase 9: Jira OAuth2 Integration (using unittest.mock)'

    def handle(self, *args, **options):
        self.stdout.write("Starting Phase 9 Verification...")

        # 1. Setup mock integration
        integration, _ = Integration.objects.update_or_create(
            name="Test Jira OAuth",
            source_type="jira",
            defaults={
                'base_url': "https://test.atlassian.net",
                'credentials': {
                    'access_token': 'old_token',
                    'refresh_token': 'valid_refresh_token',
                    'client_id': 'test_client_id',
                    'client_secret': 'test_client_secret',
                    'expires_at': (timezone.now() - timezone.timedelta(hours=1)).isoformat()
                }
            }
        )

        connector = JiraConnector(integration)

        # 2. Mock requests.post for token refresh
        with patch('requests.post') as mock_post:
            mock_refresh_response = MagicMock()
            mock_refresh_response.status_code = 200
            mock_refresh_response.json.return_value = {
                "access_token": "new_shiny_token",
                "refresh_token": "even_newer_refresh_token",
                "expires_in": 3600
            }
            mock_post.return_value = mock_refresh_response

            # 3. Mock requests.get for Jira API
            with patch('requests.get') as mock_get:
                # First call: 401 Unauthorized
                # Second call (after refresh): 200 OK
                mock_401_response = MagicMock()
                mock_401_response.status_code = 401
                mock_401_response.text = 'Unauthorized'

                mock_200_response = MagicMock()
                mock_200_response.status_code = 200
                mock_200_response.json.return_value = {
                    'issues': [{
                        'key': 'TEST-1', 
                        'fields': {
                            'summary': 'Test', 
                            'issuetype': {'name': 'Story'}, 
                            'status': {'name': 'Done'}, 
                            'created': '2026-01-01', 
                            'updated': '2026-01-01'
                        }
                    }]
                }

                mock_get.side_effect = [mock_401_response, mock_200_response]

                self.stdout.write("Testing automatic token refresh on 401...")
                items = connector.fetch_work_items()
                
                if items and items[0]['external_id'] == 'TEST-1':
                    self.stdout.write(self.style.SUCCESS("PASS: Automatically refreshed token and fetched data."))
                else:
                    self.stdout.write(self.style.ERROR(f"FAIL: Did not fetch data correctly. Items: {items}"))

                # Verify credentials were saved
                integration.refresh_from_db()
                if integration.credentials['access_token'] == 'new_shiny_token':
                    self.stdout.write(self.style.SUCCESS("PASS: New credentials persisted to DB."))
                else:
                    self.stdout.write(self.style.ERROR(f"FAIL: Credentials not persisted. Got: {integration.credentials.get('access_token')}"))

        self.stdout.write("Verification complete.")
