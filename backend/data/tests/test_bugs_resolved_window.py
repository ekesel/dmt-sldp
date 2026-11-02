from datetime import datetime

from django.db.models.signals import post_save
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase


def at(day):
    return timezone.make_aware(datetime(2026, 9, day, 12))


class BugsResolvedWindowTest(TenantTestCase):
    """SprintMetrics.bugs_completed counts bugs resolved between sprint start and actual close (Jira's rule)."""

    def setUp(self):
        from data.models import AIInsight, WorkItem
        from data.signals import ai_insight_telemetry_signal, work_item_telemetry_signal

        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        super().setUp()

    def test_only_bugs_resolved_inside_the_sprint_count(self):
        from configuration.models import Project, SourceConfiguration
        from data.analytics.metrics import MetricService
        from data.models import Sprint, SprintMetrics, WorkItem

        project = Project.objects.create(tenant=self.tenant, name='SM', key='SM')
        src = SourceConfiguration.objects.create(project=project, source_type='jira', name='J', base_url='https://j.test')
        # Planned end 14 Sep, actually closed 1 Oct (like SM Sprint 21).
        sprint = Sprint.objects.create(external_id='s21', source_config_id=src.id, name='SM Sprint 21',
                                       start_date=at(8), end_date=at(14), completed_at=timezone.make_aware(datetime(2026, 10, 1, 9)))
        resolved = {
            'before-start': at(5), 'inside': at(20), 'on-close-day': timezone.make_aware(datetime(2026, 10, 1, 18)),
            'after-close': timezone.make_aware(datetime(2026, 10, 5, 12)),
        }
        for key, when in resolved.items():
            WorkItem.objects.create(external_id=key, source_config_id=src.id, sprint=sprint, item_type='bug', title=key,
                                    status='Done', status_category='done', created_at=at(1), updated_at=when, resolved_at=when)

        MetricService.populate_sprint_metrics(sprint.id)

        self.assertEqual(SprintMetrics.objects.get(sprint_name='SM Sprint 21', project=project).bugs_completed, 2)

    def test_non_jira_sprints_are_unchanged(self):
        from configuration.models import Project, SourceConfiguration
        from data.analytics.metrics import MetricService
        from data.models import Sprint, SprintMetrics, WorkItem

        project = Project.objects.create(tenant=self.tenant, name='OCS', key='OCS')
        src = SourceConfiguration.objects.create(project=project, source_type='clickup', name='C', base_url='https://c.test')
        sprint = Sprint.objects.create(external_id='s40', source_config_id=src.id, name='Sprint 40', start_date=at(8), end_date=at(14))
        WorkItem.objects.create(external_id='late', source_config_id=src.id, sprint=sprint, item_type='bug', title='late',
                                status='done', status_category='done', created_at=at(1), updated_at=at(28), resolved_at=at(28))

        MetricService.populate_sprint_metrics(sprint.id)

        self.assertEqual(SprintMetrics.objects.get(sprint_name='Sprint 40', project=project).bugs_completed, 1)
