from django.test import TestCase
from django.utils import timezone
from datetime import datetime
from etl.transformers import TaskHistoryParser, ComplianceEngine

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


class TestLastEnteredStatus(TestCase):
    """Jira done date = the last move into the current Done status, not the first resolution."""

    def test_reopened_issue_uses_final_done(self):
        history = [
            {'created': '2026-07-06T10:00:00.000+0000', 'items': [{'field': 'status', 'toString': 'Done'}]},
            {'created': '2026-07-08T10:00:00.000+0000', 'items': [{'field': 'status', 'toString': 'In Progress'}]},
            {'created': '2026-07-15T10:00:00.000+0000', 'items': [{'field': 'status', 'toString': 'Done'}]},
        ]
        done = TaskHistoryParser.extract_last_entered(history, 'Done')
        self.assertEqual(done.date(), datetime(2026, 7, 15).date())

    def test_no_matching_transition(self):
        history = [{'created': '2026-07-06T10:00:00.000+0000', 'items': [{'field': 'assignee', 'toString': 'x'}]}]
        self.assertIsNone(TaskHistoryParser.extract_last_entered(history, 'Done'))
        self.assertIsNone(TaskHistoryParser.extract_last_entered([], 'Done'))


class TestComplianceStage(TestCase):
    def test_jira_reopened_gets_full_checks(self):
        # Jira puts Reopened in the To Do category; it must not stop at the AC check.
        item = {'status': 'Reopened', 'status_category': 'todo', 'item_type': 'story', 'ac_quality': 'final'}
        ok, failures = ComplianceEngine.check_compliance(item)
        self.assertFalse(ok)
        self.assertIn('unit_testing_not_done', failures)

    def test_todo_checks_ac_only(self):
        item = {'status': 'To Do', 'status_category': 'todo', 'item_type': 'story', 'ac_quality': 'final'}
        self.assertEqual(ComplianceEngine.check_compliance(item), (True, []))
