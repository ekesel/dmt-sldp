import sys
from unittest.mock import MagicMock

# Mock Django and data.models before importing JiraConnector
mock_workitem = MagicMock()
sys.modules['data.models'] = MagicMock(WorkItem=mock_workitem)
sys.modules['django.utils'] = MagicMock()
sys.modules['django.utils.timezone'] = MagicMock()
sys.modules['django.utils.dateparse'] = MagicMock()

import unittest
from unittest.mock import patch
from etl.connectors.jira import JiraConnector

class TestJiraConnector(unittest.TestCase):
    def setUp(self):
        self.config = {
            'base_url': 'https://test.atlassian.net',
            'username': 'test@example.com',
            'api_token': 'test-token',
            'workspace_id': 'PROJ'
        }
        self.connector = JiraConnector(self.config)

    def test_auth_header(self):
        headers = self.connector._get_auth_header()
        self.assertIn('Authorization', headers)
        self.assertTrue(headers['Authorization'].startswith('Basic '))

    def test_flatten_adf(self):
        adf = {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": "Hello "},
                        {"type": "text", "text": "world"}
                    ]
                }
            ]
        }
        text = self.connector._flatten_adf(adf)
        self.assertEqual(text, "Hello world")

    def test_normalize_status(self):
        self.assertEqual(self.connector.normalize_status('To Do'), 'todo')
        self.assertEqual(self.connector.normalize_status('In Progress'), 'in_progress')
        self.assertEqual(self.connector.normalize_status('Done'), 'done')
        self.assertEqual(self.connector.normalize_status('Closed'), 'done')

    @patch('requests.get')
    def test_test_connection_success(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response
        
        self.assertTrue(self.connector.test_connection())

    @patch('requests.get')
    def test_test_connection_failure(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        mock_get.return_value = mock_response
        
        with self.assertRaises(Exception) as cm:
            self.connector.test_connection()
        self.assertIn("401", str(cm.exception))

if __name__ == '__main__':
    unittest.main()
