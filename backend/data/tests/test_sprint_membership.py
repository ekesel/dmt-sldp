from datetime import datetime

from django.db.models.signals import post_save
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase


def at(month, day):
    return timezone.make_aware(datetime(2026, month, day, 12))


class SprintMembershipRollupTest(TenantTestCase):
    """ClickUp sprint points count carried-over items in every sprint list, minus done-before-start and Closed."""

    def setUp(self):
        from data.models import AIInsight, WorkItem
        from data.signals import ai_insight_telemetry_signal, work_item_telemetry_signal

        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        super().setUp()

    def test_points_follow_sprint_list_membership(self):
        from configuration.models import Project, SourceConfiguration
        from data.analytics.metrics import MetricService
        from data.models import DeveloperMetrics, Sprint, SprintMetrics, WorkItem

        project = Project.objects.create(tenant=self.tenant, name='OCS', key='OCS')
        src = SourceConfiguration.objects.create(project=project, source_type='clickup', name='C', base_url='https://c.test')
        s29 = Sprint.objects.create(external_id='clickup_sprint_29', source_config_id=src.id, name='Sprint 29',
                                    start_date=at(4, 15), end_date=at(4, 28), status='completed')
        s33 = Sprint.objects.create(external_id='clickup_sprint_33', source_config_id=src.id, name='Sprint 33',
                                    start_date=at(6, 10), end_date=at(6, 23), status='completed')

        def item(key, sprint, points, resolved, status='done', members=()):
            w = WorkItem.objects.create(external_id=key, source_config_id=src.id, sprint=sprint, item_type='story', title=key,
                                        status=status, status_category='done', story_points=points, assignee_email='dev@ocs.test',
                                        created_at=at(4, 1), updated_at=resolved, started_at=at(4, 14), resolved_at=resolved)
            w.sprints.set([sprint, *members])

        item('own', s29, 3, at(4, 20))
        item('carried', s33, 5, at(4, 25), members=[s29])  # in Sprint 29's list too; FK points at the latest
        item('closed', s29, 8, at(4, 22), status='Closed')
        item('done-early', s33, 13, at(4, 20), members=[s29])  # finished in 29, then added to 33
        item('rolled-over', s33, 2, at(6, 15), members=[s29])  # bulk-closed in 33: ClickUp counts it in both lists
        epic = WorkItem.objects.create(external_id='epic', source_config_id=src.id, sprint=s29, item_type='epic', title='epic',
                                       status='open', status_category='todo', created_at=at(4, 1), updated_at=at(4, 1))
        item('epic-child', s29, 4, at(4, 20))  # a ClickUp subtask of an Epic: not a team story, still dev credit
        WorkItem.objects.filter(external_id='epic-child').update(parent=epic)

        for s in (s29, s33):
            MetricService.populate_sprint_metrics(s.id)
            MetricService.populate_developer_metrics(s.id)

        self.assertEqual(SprintMetrics.objects.get(sprint_name='Sprint 29', project=project).total_story_points_completed, 23)
        self.assertEqual(SprintMetrics.objects.get(sprint_name='Sprint 33', project=project).total_story_points_completed, 2)
        self.assertEqual(DeveloperMetrics.objects.get(sprint_name='Sprint 29', project=project).story_points_completed, 27)
        self.assertEqual(DeveloperMetrics.objects.get(sprint_name='Sprint 33', project=project).story_points_completed, 2)

    def test_closed_counts_when_it_is_the_only_done_status(self):
        from configuration.models import Project, SourceConfiguration
        from data.analytics.metrics import MetricService
        from data.models import Sprint, SprintMetrics, WorkItem

        project = Project.objects.create(tenant=self.tenant, name='OCS', key='OCS')
        src = SourceConfiguration.objects.create(project=project, source_type='clickup', name='C', base_url='https://c.test')
        s1 = Sprint.objects.create(external_id='clickup_sprint_1', source_config_id=src.id, name='Sprint 1',
                                   start_date=at(3, 19), end_date=at(4, 1), status='completed')
        w = WorkItem.objects.create(external_id='old', source_config_id=src.id, sprint=s1, item_type='story', title='old',
                                    status='Closed', status_category='done', story_points=5,
                                    created_at=at(3, 1), updated_at=at(3, 25), resolved_at=at(3, 25))
        w.sprints.set([s1])

        MetricService.populate_sprint_metrics(s1.id)

        self.assertEqual(SprintMetrics.objects.get(sprint_name='Sprint 1', project=project).total_story_points_completed, 5)
