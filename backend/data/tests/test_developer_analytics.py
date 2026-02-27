from django_tenants.test.cases import TenantTestCase
from users.models import User
from rest_framework.test import APIRequestFactory, force_authenticate
from data.views import DeveloperListView, DeveloperMetricsView
from data.models import DeveloperMetrics, Sprint
from configuration.models import Project
from django.utils import timezone

class DeveloperAnalyticsTest(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpass')
        self.project1 = Project.objects.create(tenant=self.tenant, name='Project Alpha', key='ALPHA')
        self.project2 = Project.objects.create(tenant=self.tenant, name='Project Beta', key='BETA')
        
        now = timezone.now()
        # Create some sprints
        self.sprint1 = Sprint.objects.create(external_id='SPR1', name='Sprint 1', start_date=now - timezone.timedelta(days=28), end_date=now - timezone.timedelta(days=14), status='closed')
        self.sprint2 = Sprint.objects.create(external_id='SPR2', name='Sprint 2', start_date=now - timezone.timedelta(days=14), end_date=now, status='active')
        
        # Metrics for Dev 1 in Project Alpha
        DeveloperMetrics.objects.create(
            developer_source_id='dev1',
            developer_name='Dev One',
            developer_email='dev1@example.com',
            sprint_name=self.sprint1.name,
            sprint_end_date=self.sprint1.end_date.date(),
            project=self.project1,
            story_points_completed=5,
            prs_merged=2,
            dmt_compliance_rate=90.0
        )
        DeveloperMetrics.objects.create(
            developer_source_id='dev1',
            developer_name='Dev One',
            developer_email='dev1@example.com',
            sprint_name=self.sprint2.name,
            sprint_end_date=self.sprint2.end_date.date(),
            project=self.project1,
            story_points_completed=8,
            prs_merged=3,
            dmt_compliance_rate=95.0
        )
        
        # Metrics for Dev 1 in Project Beta (Multi-project dev)
        DeveloperMetrics.objects.create(
            developer_source_id='dev1_beta',
            developer_name='Dev One',
            developer_email='dev1@example.com',
            sprint_name=self.sprint2.name,
            sprint_end_date=self.sprint2.end_date.date(),
            project=self.project2,
            story_points_completed=3,
            prs_merged=1,
            dmt_compliance_rate=80.0
        )

        self.factory = APIRequestFactory()

    def test_developer_list_grouping(self):
        request = self.factory.get('/api/developers/')
        force_authenticate(request, user=self.user)
        response = DeveloperListView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        
        # Should have 1 unique developer
        self.assertEqual(len(response.data), 1)
        dev = response.data[0]
        self.assertEqual(dev['developer_email'], 'dev1@example.com')
        # Should belong to 2 projects
        project_ids = [p['id'] for p in dev['projects']]
        self.assertIn(self.project1.id, project_ids)
        self.assertIn(self.project2.id, project_ids)

    def test_developer_metrics_limit(self):
        # Test with limit=1
        request = self.factory.get('/api/developers/dev1@example.com/metrics/?limit=1')
        force_authenticate(request, user=self.user)
        # Using URL param version of view call
        response = DeveloperMetricsView.as_view()(request, id='dev1@example.com')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        
    def test_developer_metrics_aggregation(self):
        # Test aggregated view (no project_id)
        request = self.factory.get('/api/developers/dev1@example.com/metrics/')
        force_authenticate(request, user=self.user)
        response = DeveloperMetricsView.as_view()(request, id='dev1@example.com')
        self.assertEqual(response.status_code, 200)
        
        # Should have 2 entries (one per sprint)
        # Sprint 2 should be aggregated (Alpha=8, Beta=3 => 11)
        sprint2_data = next(item for item in response.data if item['sprint_name'] == 'Sprint 2')
        self.assertEqual(sprint2_data['story_points_completed'], 11)
        self.assertEqual(sprint2_data['prs_merged'], 4)
        # Avg compliance: (95 + 80) / 2 = 87.5
        self.assertEqual(sprint2_data['dmt_compliance_rate'], 87.5)
