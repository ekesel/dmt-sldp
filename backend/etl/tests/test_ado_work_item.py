from datetime import datetime, timezone as dt_timezone
from unittest import mock

from django.db.models.signals import post_save
from django_tenants.test.cases import TenantTestCase


class AdoWorkItemTest(TenantTestCase):
    """Done items without ResolvedDate keep their ClosedDate; backlog items (root path) get no sprint."""

    def setUp(self):
        from data.models import AIInsight, WorkItem
        from data.signals import ai_insight_telemetry_signal, work_item_telemetry_signal

        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        super().setUp()

    def test_closed_date_fallback_and_backlog_item_has_no_sprint(self):
        from configuration.models import Project, SourceConfiguration
        from data.models import Sprint, WorkItem
        from etl.connectors.ado import AzureDevOpsConnector

        project = Project.objects.create(tenant=self.tenant, name='Tatva', key='TAT')
        src = SourceConfiguration.objects.create(project=project, source_type='azure_devops', name='A', base_url='https://dev.azure.com/org/TATVA')
        Sprint.objects.create(external_id='guid-32', source_config_id=src.id, name='Sprint 32', status='completed',
                              start_date=datetime(2026, 10, 16, tzinfo=dt_timezone.utc), end_date=datetime(2026, 10, 29, tzinfo=dt_timezone.utc))
        conn = AzureDevOpsConnector({'base_url': 'https://dev.azure.com/org/TATVA', 'api_key': 'x'})
        conn._state_categories = lambda project, wtype: {}  # no ADO call; name lists apply

        def item(id_, path):
            return {'id': id_, 'fields': {'System.Title': 't', 'System.WorkItemType': 'Task', 'System.State': 'Done',
                                          'System.IterationPath': path, 'System.IterationId': 99,
                                          'Microsoft.VSTS.Common.ClosedDate': '2026-10-20T10:00:00Z'}}

        conn._process_work_item(item(1, 'TATVA\\Sprint 32'), src.id)
        conn._process_work_item(item(2, 'TATVA'), src.id)

        in_sprint = WorkItem.objects.get(source_config_id=src.id, external_id='1')
        backlog = WorkItem.objects.get(source_config_id=src.id, external_id='2')
        self.assertEqual(in_sprint.resolved_at, datetime(2026, 10, 20, 10, tzinfo=dt_timezone.utc))
        self.assertEqual(in_sprint.sprint.name, 'Sprint 32')
        self.assertIsNone(backlog.sprint)


class AdoStatusAndLinkingTest(TenantTestCase):
    """State categories from ADO, safe sprint linking, and team-filtered sprints."""

    def setUp(self):
        from configuration.models import Project, SourceConfiguration
        from data.models import AIInsight, Sprint, WorkItem
        from data.signals import ai_insight_telemetry_signal, work_item_telemetry_signal
        from etl.connectors.ado import AzureDevOpsConnector

        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        super().setUp()
        project = Project.objects.create(tenant=self.tenant, name='Tatva', key='TAT')
        self.src = SourceConfiguration.objects.create(project=project, source_type='azure_devops', name='A',
                                                      base_url='https://dev.azure.com/org/TATVA')
        self.conn = AzureDevOpsConnector({'base_url': 'https://dev.azure.com/org/TATVA', 'api_key': 'x',
                                          'active_folder_name': 'TATVA / TATVA Team'})
        self.categories = {'in testing': 'InProgress', 'qa verified': 'Resolved', 'done': 'Completed', 'to do': 'Proposed'}
        self.conn._state_categories = lambda project, wtype: self.categories
        self.Sprint, self.WorkItem = Sprint, WorkItem

    def process(self, id_, state, **fields):
        base = {'System.Title': 't', 'System.WorkItemType': 'Task', 'System.State': state,
                'System.TeamProject': 'TATVA', 'System.ChangedDate': '2026-10-21T08:00:00Z'}
        self.conn._process_work_item({'id': id_, 'fields': {**base, **fields}}, self.src.id)
        return self.WorkItem.objects.get(source_config_id=self.src.id, external_id=str(id_))

    def test_status_follows_ado_state_category(self):
        self.assertEqual(self.process(1, 'In Testing').status_category, 'in_progress')
        self.assertEqual(self.process(2, 'QA Verified').status_category, 'done')
        self.assertEqual(self.process(3, 'To Do').status_category, 'todo')

    def test_unknown_state_without_category_is_in_progress(self):
        self.categories = {}
        self.conn._state_categories = lambda project, wtype: {}
        self.assertEqual(self.process(4, 'In Review').status_category, 'in_progress')
        self.assertIsNone(self.process(5, 'In Review').resolved_at)
        self.assertEqual(self.process(6, 'Closed').status_category, 'done')

    def test_resolved_at_falls_back_to_changed_date(self):
        item = self.process(7, 'Done')
        self.assertEqual(item.resolved_at, datetime(2026, 10, 21, 8, tzinfo=dt_timezone.utc))

    def test_no_iteration_id_does_not_match_by_item_id(self):
        self.Sprint.objects.create(external_id='8', source_config_id=self.src.id, name='Sprint 8', status='completed')
        self.assertIsNone(self.process(8, 'Done', **{'System.IterationPath': 'TATVA'}).sprint)

    def test_ambiguous_sprint_name_is_not_linked(self):
        for ext in ('a', 'b'):
            self.Sprint.objects.create(external_id=ext, source_config_id=self.src.id, name='Sprint 32', status='completed')
        self.assertIsNone(self.process(9, 'Done', **{'System.IterationPath': 'TATVA\\Sprint 32'}).sprint)

    def test_team_filtered_source_marks_other_teams_iterations(self):
        self.Sprint.objects.create(external_id='other', source_config_id=self.src.id, name='Other S1', status='completed')
        urls = []

        def fake_get(url, headers=None, **kw):
            urls.append(url)
            resp = mock.Mock(status_code=200)
            if '/teams?' in url:
                resp.json.return_value = {'value': [{'name': 'TATVA Team'}, {'name': 'Other Team'}]}
            else:
                resp.json.return_value = {'value': [{'id': 'mine', 'name': 'Sprint 1', 'path': 'TATVA\\Sprint 1',
                                                     'attributes': {'startDate': '2026-09-01T00:00:00Z',
                                                                    'finishDate': '2026-09-14T00:00:00Z'}}]}
            return resp

        with mock.patch('etl.connectors.ado.requests.get', side_effect=fake_get):
            self.conn._sync_sprints('TATVA', self.src.id, {})
        self.assertFalse(any('Other%20Team' in u for u in urls))
        self.assertEqual(self.Sprint.objects.get(external_id='other').status, 'other_team')
        self.assertEqual(self.Sprint.objects.get(external_id='mine').status, 'completed')
