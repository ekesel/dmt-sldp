from django_tenants.test.cases import TenantTestCase
from django.db.models.signals import post_save
from users.models import User
from data.models import WorkItem, AIInsight, SprintMetrics
from configuration.models import SourceConfiguration, Project
from data.ai.tasks import refresh_ai_insights
from data.signals import work_item_telemetry_signal, ai_insight_telemetry_signal
from django.utils import timezone
from unittest.mock import patch, MagicMock

class AIInsightsTaskTest(TenantTestCase):
    def setUp(self):
        # Disconnect signals that require Redis
        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        
        super().setUp()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpass')
        self.project = Project.objects.create(tenant=self.tenant, name='Test Project', key='TEST')
        self.source = SourceConfiguration.objects.create(
            project=self.project,
            source_type='jira',
            name='Jira',
            base_url='https://jira.com'
        )
        
    @patch('data.ai.tasks.async_to_sync')
    @patch('data.ai.tasks.get_channel_layer')
    @patch('data.ai.tasks.GeminiAIProvider')
    def test_refresh_ai_insights_with_null_metrics(self, mock_ai_provider, mock_get_channel_layer, mock_async_to_sync):
        # Mock AI provider response
        mock_instance = mock_ai_provider.return_value
        mock_instance.generate_optimization_insights.return_value = {
            "summary": "Mock summary",
            "suggestions": [{"title": "Suggestion 1", "impact": "High", "description": "Do something"}]
        }
        
        # Mock channel layer and async_to_sync
        mock_channel = MagicMock()
        mock_get_channel_layer.return_value = mock_channel
        mock_async_to_sync.side_effect = lambda x: x # Just return the inner function

        # Create some SprintMetrics with None for avg_cycle_time_days
        SprintMetrics.objects.create(
            sprint_name="Sprint 1",
            sprint_start_date=timezone.now().date(),
            sprint_end_date=timezone.now().date(),
            project=self.project,
            avg_cycle_time_days=None,
            compliance_rate_percent=85.0
        )
        
        # Create at least one work item
        WorkItem.objects.create(
            external_id='WI-1',
            source_config_id=self.source.id,
            title='Test Item',
            status='In Progress',
            status_category='in_progress',
            created_at=timezone.now(),
            updated_at=timezone.now()
        )

        result = refresh_ai_insights(project_id=self.project.id, schema_name=self.tenant.schema_name)
        
        self.assertIn("AI Insight generated", result)
        self.assertEqual(AIInsight.objects.count(), 1)
        
    @patch('data.ai.tasks.async_to_sync')
    @patch('data.ai.tasks.get_channel_layer')
    def test_refresh_ai_insights_failure_notification(self, mock_get_channel_layer, mock_async_to_sync):
        # Mock channel layer and async_to_sync
        mock_channel = MagicMock()
        mock_get_channel_layer.return_value = mock_channel
        mock_async_to_sync.side_effect = lambda x: x

        with patch('data.ai.tasks.Project.objects.get', side_effect=Exception("Database crash")):
            with self.assertRaises(Exception):
                refresh_ai_insights(project_id=999, schema_name=self.tenant.schema_name)
        
        self.assertTrue(mock_channel.group_send.called)
        # Check the failure message
        args, kwargs = mock_channel.group_send.call_args
        self.assertEqual(args[1]['message']['status'], "Error: Database crash")
        self.assertEqual(args[1]['message']['progress'], 0)
