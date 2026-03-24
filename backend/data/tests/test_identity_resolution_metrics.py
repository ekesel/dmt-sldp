from django_tenants.test.cases import TenantTestCase
from users.models import User
from rest_framework.test import APIRequestFactory, force_authenticate
from data.views import DeveloperListView, DeveloperMetricsView
from data.models import DeveloperMetrics, Sprint, WorkItem, UserIdentityMapping
from configuration.models import Project, SourceConfiguration
from data.analytics.metrics import MetricService
from django.utils import timezone
from unittest.mock import patch

class IdentityResolutionMetricsTest(TenantTestCase):
    def setUp(self):
        # Mock channel layer and async_to_sync to avoid Redis connection errors in signals
        self.patcher = patch('data.signals.get_channel_layer')
        self.mock_get_channel_layer = self.patcher.start()
        
        # Mock async_to_sync to just return the coro, avoiding await issues with MagicMock
        self.patcher_sync = patch('data.signals.async_to_sync', side_effect=lambda x: x)
        self.patcher_sync.start()
        
        super().setUp()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpass')
        self.project = Project.objects.create(tenant=self.tenant, name='Project X', key='PX')
        self.source = SourceConfiguration.objects.create(project=self.project, source_type='github', name='Repo')
        
        now = timezone.now()
        # Ensure we have a valid sprint range
        self.sprint = Sprint.objects.create(
            external_id='S1', 
            name='Sprint 1', 
            start_date=now - timezone.timedelta(days=7), 
            end_date=now + timezone.timedelta(days=7), 
            status='active'
        )
        
        # Two different emails for the same person
        self.email_a = 'alice_github@example.com'
        self.email_b = 'alice_work@example.com'  # Canonical
        
        # Work items with different emails
        WorkItem.objects.create(
            external_id='WI1', title='Task 1', assignee_email=self.email_a, assignee_name='Alice G',
            sprint=self.sprint, source_config_id=self.source.id,
            status_category='done', story_points=3, dmt_compliant=True,
            created_at=now, updated_at=now
        )
        WorkItem.objects.create(
            external_id='WI2', title='Task 2', assignee_email=self.email_b, assignee_name='Alice W',
            sprint=self.sprint, source_config_id=self.source.id,
            status_category='done', story_points=5, dmt_compliant=True,
            created_at=now, updated_at=now
        )
        
        # Identity Mapping
        UserIdentityMapping.objects.create(
            canonical_email=self.email_b,
            canonical_name='Alice Canonical',
            source_identities=[{'email': self.email_a}, {'email': self.email_b}]
        )
        
        self.factory = APIRequestFactory()

    def tearDown(self):
        super().tearDown()
        self.patcher.stop()
        self.patcher_sync.stop()

    def test_metrics_aggregation_by_identity(self):
        """Verify that populate_developer_metrics aggregates by canonical email."""
        # Trigger metric population
        MetricService.populate_developer_metrics(self.sprint.id)
        
        # Should only have ONE DeveloperMetric entry for the canonical email
        metrics = DeveloperMetrics.objects.filter(sprint_name=self.sprint.name)
        # Note: Depending on existing data in the tenant, there might be others, 
        # but for Alice there should be exactly one canonical record.
        alice_metrics = metrics.filter(developer_email=self.email_b)
        self.assertEqual(alice_metrics.count(), 1)
        
        # Verify alias record does NOT exist as a separate entry
        alias_metrics = metrics.filter(developer_email=self.email_a)
        self.assertEqual(alias_metrics.count(), 0)
        
        alice_data = alice_metrics.first()
        self.assertEqual(alice_data.developer_name, 'Alice Canonical')
        # Combined points: 3 + 5 = 8
        self.assertEqual(alice_data.story_points_completed, 8)

    def test_view_resolves_alias_to_canonical(self):
        """Verify that querying metrics for an alias returns the canonical data."""
        # Populate metrics first
        MetricService.populate_developer_metrics(self.sprint.id)
        
        # Request metrics using the ALIAS email
        request = self.factory.get(f'/api/developers/{self.email_a}/metrics/')
        force_authenticate(request, user=self.user)
        response = DeveloperMetricsView.as_view()(request, id=self.email_a)
        
        self.assertEqual(response.status_code, 200)
        # Should return metrics for the canonical Alice
        # result = [combined_snapshot, history_sprint_1] => 2 entries
        self.assertEqual(len(response.data), 2)
        # Both should have the same combined story points for this simple single-sprint case
        self.assertEqual(response.data[0]['story_points_completed'], 8)
        self.assertEqual(response.data[1]['story_points_completed'], 8)

    def test_developer_list_deduplication(self):
        """Verify that the developer list shows only the canonical identity."""
        MetricService.populate_developer_metrics(self.sprint.id)
        
        request = self.factory.get('/api/developers/')
        force_authenticate(request, user=self.user)
        response = DeveloperListView.as_view()(request)
        
        self.assertEqual(response.status_code, 200)
        # Should find Alice Canonical and NOT the alias
        emails = [d['developer_email'] for d in response.data]
        self.assertIn(self.email_b, emails)
        self.assertNotIn(self.email_a, emails)
        
        alice = next(d for d in response.data if d['developer_email'] == self.email_b)
        self.assertEqual(alice['developer_name'], 'Alice Canonical')
