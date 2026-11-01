from datetime import datetime, timezone as dt_timezone

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
