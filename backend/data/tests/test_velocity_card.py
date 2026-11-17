from datetime import date

from django_tenants.test.cases import TenantTestCase
from rest_framework.test import APIRequestFactory, force_authenticate


class VelocityCardDateRangeTest(TenantTestCase):
    """Bug 10591: a date range spanning sprints shows total velocity, not the sprints' average."""

    def setUp(self):
        from configuration.models import Project
        from data.models import SprintMetrics
        from users.models import User

        super().setUp()
        self.user = User.objects.create_user(username='u', email='u@x.test', password='p')
        self.project = Project.objects.create(tenant=self.tenant, name='OCS', key='OCS')
        for name, start, end, pts in [('S1', date(2026, 9, 1), date(2026, 9, 14), 10),
                                      ('S2', date(2026, 9, 15), date(2026, 9, 28), 20)]:
            SprintMetrics.objects.create(project=self.project, sprint_name=name, sprint_start_date=start,
                                         sprint_end_date=end, velocity=pts, total_story_points_completed=pts)

    def card(self, **params):
        from data.views import DashboardSummaryView
        request = APIRequestFactory().get('/', {'project_id': self.project.id, **params})
        force_authenticate(request, user=self.user)
        return DashboardSummaryView.as_view()(request).data['velocity']

    def test_date_range_across_sprints_shows_total(self):
        self.assertEqual(self.card(start_date='2026-09-01', end_date='2026-09-30'), 30)

    def test_no_date_range_keeps_average(self):
        self.assertEqual(self.card(), 15)
