from django.test import TestCase
from django.utils import timezone
from datetime import datetime
from etl.transformers import TaskHistoryParser

class TestTaskHistoryParser(TestCase):
    def test_jira_extraction(self):
        # Mock Jira changelog
        history = [
            {
                'created': '2023-10-27T10:00:00.000+0000',
                'items': [
                    {'field': 'status', 'toString': 'To Do'}
                ]
            },
            {
                'created': '2023-10-27T12:00:00.000+0000',
                'items': [
                    {'field': 'status', 'toString': 'In Progress'}
                ]
            }
        ]
        
        started_at = TaskHistoryParser.extract_started_at(history, 'jira')
        self.assertIsNotNone(started_at)
        self.assertEqual(started_at.hour, 12)
        
    def test_clickup_extraction(self):
        # Mock ClickUp history (if relevant, though connector uses field mostly)
        history = [
            {
                'type': 'status_change',
                'date': '1698408000000', # 2023-10-27 12:00:00 UTC
                'after': {'status': 'in progress'}
            }
        ]
        
        started_at = TaskHistoryParser.extract_started_at(history, 'clickup')
        self.assertIsNotNone(started_at)
        self.assertEqual(started_at.year, 2023)
