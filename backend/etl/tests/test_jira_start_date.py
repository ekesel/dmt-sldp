from datetime import date

from django.test import SimpleTestCase
from django.utils import timezone

from etl.connectors.jira import JiraConnector


class JiraStartDateTests(SimpleTestCase):
    """The mapped Jira "Start date" field (start_date_id) is read as a local calendar day."""

    def setUp(self):
        self.connector = JiraConnector({'base_url': 'https://x.atlassian.net', 'field_mapping': {'start_date_id': 'customfield_10015'}})

    def test_date_only_value_keeps_its_day(self):
        started = self.connector._parse_start_date('2026-06-10')
        self.assertEqual(timezone.localtime(started).date(), date(2026, 6, 10))

    def test_datetime_value_uses_its_date(self):
        started = self.connector._parse_start_date('2026-06-10T00:00:00.000+0000')
        self.assertEqual(timezone.localtime(started).date(), date(2026, 6, 10))

    def test_blank_means_not_started(self):
        self.assertIsNone(self.connector._parse_start_date(None))
        self.assertIsNone(self.connector._parse_start_date(''))
