from datetime import datetime

from django.db.models.signals import post_save
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase


def at(day):
    return timezone.make_aware(datetime(2026, 9, day, 12))


class EmptySprintRollupTest(TenantTestCase):
    """A project's own sprint with no items still gets a 0-velocity row, so it shows in Velocity History."""

    def setUp(self):
        from data.models import AIInsight, WorkItem
        from data.signals import ai_insight_telemetry_signal, work_item_telemetry_signal

        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        super().setUp()

    def test_empty_own_sprint_gets_zero_row_other_project_skipped(self):
        from configuration.models import Project, SourceConfiguration
        from data.analytics.metrics import MetricService
        from data.models import Sprint, SprintMetrics

        tatva = Project.objects.create(tenant=self.tenant, name='Tatva', key='TAT')
        other = Project.objects.create(tenant=self.tenant, name='Other', key='OTH')
        src = SourceConfiguration.objects.create(project=tatva, source_type='azure_devops', name='A', base_url='https://a.test',
                                                 config_json={'active_folder_id': 'x', 'active_folder_name': 'TATVA / TATVA Team'})
        SourceConfiguration.objects.create(project=other, source_type='azure_devops', name='B', base_url='https://b.test')
        sprint = Sprint.objects.create(external_id='s30', source_config_id=src.id, name='Sprint 30',
                                       start_date=at(1), end_date=at(14), status='completed')

        MetricService.populate_sprint_metrics(sprint.id)

        self.assertEqual(SprintMetrics.objects.get(sprint_name='Sprint 30', project=tatva).velocity, 0)
        self.assertFalse(SprintMetrics.objects.filter(sprint_name='Sprint 30', project=other).exists())

    def test_empty_closed_jira_sprint_gets_zero_row(self):
        from configuration.models import Project, SourceConfiguration
        from data.analytics.metrics import MetricService
        from data.models import Sprint, SprintMetrics

        project = Project.objects.create(tenant=self.tenant, name='SM', key='SM')
        src = SourceConfiguration.objects.create(project=project, source_type='jira', name='J', base_url='https://j.test')
        sprint = Sprint.objects.create(external_id='jira_sprint_7', source_config_id=src.id, name='SM Sprint 7',
                                       start_date=at(1), end_date=at(14), status='closed')

        MetricService.populate_sprint_metrics(sprint.id)

        self.assertEqual(SprintMetrics.objects.get(sprint_name='SM Sprint 7', project=project).velocity, 0)

    def test_folder_filtered_clickup_empty_sprint_still_skipped(self):
        from configuration.models import Project, SourceConfiguration
        from data.analytics.metrics import MetricService
        from data.models import Sprint, SprintMetrics

        project = Project.objects.create(tenant=self.tenant, name='OCS', key='OCS')
        src = SourceConfiguration.objects.create(project=project, source_type='clickup', name='C', base_url='https://c.test',
                                                 config_json={'active_folder_id': 'f1'})
        sprint = Sprint.objects.create(external_id='s9', source_config_id=src.id, name='Other Folder Sprint',
                                       start_date=at(1), end_date=at(14), status='completed')

        MetricService.populate_sprint_metrics(sprint.id)

        self.assertFalse(SprintMetrics.objects.filter(sprint_name='Other Folder Sprint', project=project).exists())
