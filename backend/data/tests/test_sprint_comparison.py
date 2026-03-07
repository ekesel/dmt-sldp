from django_tenants.test.cases import TenantTestCase
from users.models import User
from rest_framework.test import APIRequestFactory, force_authenticate
from data.sprint_comparison_views import SprintComparisonView
from data.models import SprintMetrics, Sprint
from configuration.models import Project
from django.utils import timezone

class SprintComparisonViewTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='password123')
        self.project = Project.objects.create(tenant=self.tenant, name='Project Alpha', key='ALPHA')
        
        now = timezone.now()
        # Mock Sprint Metrics
        SprintMetrics.objects.create(
            sprint_name="Sprint A",
            sprint_start_date=(now - timezone.timedelta(days=28)).date(),
            sprint_end_date=(now - timezone.timedelta(days=14)).date(),
            project=self.project,
            velocity=50,
            items_completed=20,
            compliance_rate_percent=90.0
        )
        SprintMetrics.objects.create(
            sprint_name="Sprint B",
            sprint_start_date=(now - timezone.timedelta(days=14)).date(),
            sprint_end_date=now.date(),
            project=self.project,
            velocity=60,
            items_completed=25,
            compliance_rate_percent=95.0
        )

        self.factory = APIRequestFactory()

    def test_sprint_comparison_team_view(self):
        request = self.factory.get('/api/dashboard/sprint-comparison/', {'sprint_a': 'Sprint A', 'sprint_b': 'Sprint B', 'project_id': self.project.id})
        force_authenticate(request, user=self.user)
        response = SprintComparisonView.as_view()(request)
        
        self.assertEqual(response.status_code, 200)
        
        data = response.data
        self.assertIn('kpis', data)
        self.assertIn('charts', data)
        
        # Check KPI variance logic
        velocity_kpi = data['kpis'].get('velocity')
        self.assertIsNotNone(velocity_kpi)
        self.assertEqual(velocity_kpi['a'], 50)
        self.assertEqual(velocity_kpi['b'], 60)
        self.assertEqual(velocity_kpi['variance'], 20.0) # (60-50)/50 * 100

    def test_missing_query_parameters(self):
        request = self.factory.get('/api/dashboard/sprint-comparison/')
        force_authenticate(request, user=self.user)
        response = SprintComparisonView.as_view()(request)
        self.assertEqual(response.status_code, 400)
