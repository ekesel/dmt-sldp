from django_tenants.test.cases import TenantTestCase
from django.db.models.signals import post_save
from users.models import User
from rest_framework.test import APIRequestFactory, force_authenticate
from data.views import AssigneeDistributionView
from data.models import WorkItem, AIInsight
from data.signals import work_item_telemetry_signal, ai_insight_telemetry_signal
from configuration.models import SourceConfiguration, Project
from django.utils import timezone

class AssigneeDistributionViewTest(TenantTestCase):
    def setUp(self):
        # Disconnect signals that require Redis
        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        
        super().setUp()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpass')
        
        self.project1 = Project.objects.create(tenant=self.tenant, name='Project A', key='PROJA')
        
        self.source1 = SourceConfiguration.objects.create(
            project=self.project1, 
            source_type='jira', 
            name='Jira A', 
            base_url='https://jira.com'
        )
        
        now = timezone.now()
        
        # Create 6 sprints and metrics for mapping
        from data.models import Sprint, SprintMetrics
        self.sprints = []
        for i in range(6):
            s = Sprint.objects.create(
                external_id=f'SPR-{i}',
                name=f'Sprint {i}',
                start_date=now - timezone.timedelta(days=(6-i)*14),
                end_date=now - timezone.timedelta(days=(5-i)*14),
                status='closed' if i < 5 else 'active'
            )
            self.sprints.append(s)
            
            # Create metrics so the view can find these as the "last 5"
            SprintMetrics.objects.create(
                sprint_name=s.name,
                sprint_start_date=s.start_date.date(),
                sprint_end_date=s.end_date.date(),
                project=self.project1,
                velocity=20,
                items_completed=5
            )

        # WI in oldest sprint (Sprint 0) - should be excluded
        self.wi_old = WorkItem.objects.create(
            external_id='WI-OLD',
            source_config_id=self.source1.id,
            sprint=self.sprints[0],
            title='Old Item',
            status='Done',
            status_category='done',
            assignee_email='old@example.com',
            assignee_name='Old Dev',
            created_at=now,
            updated_at=now
        )
        
        # WI in a recent sprint (Sprint 1) - should be included
        self.wi1 = WorkItem.objects.create(
            external_id='WI-1',
            source_config_id=self.source1.id,
            sprint=self.sprints[1],
            title='Item 1',
            status='Done',
            status_category='done',
            resolved_at=now,
            started_at=now - timezone.timedelta(days=2),
            assignee_email='dev@example.com',
            assignee_name='Dev One',
            created_at=now,
            updated_at=now
        )
        
        # WI in the latest sprint (Sprint 5) - should be included
        self.wi2 = WorkItem.objects.create(
            external_id='WI-2',
            source_config_id=self.source1.id,
            sprint=self.sprints[5],
            title='Item 2',
            status='In Progress',
            status_category='in_progress',
            assignee_email='dev@example.com',
            assignee_name='Dev One',
            created_at=now,
            updated_at=now
        )
        self.factory = APIRequestFactory()

    def test_aggregation_by_email_last_5_sprints(self):
        # We specify project_id to trigger that branch of logic
        request = self.factory.get(f'/api/dashboard/assignee-distribution/?project_id={self.project1.id}')
        force_authenticate(request, user=self.user)
        response = AssigneeDistributionView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        data = response.data
        
        # Should NOT contain Old Dev because Sprint 0 is outside the last 5 (1, 2, 3, 4, 5)
        self.assertEqual(len(data), 1)
        entry = data[0]
        self.assertEqual(entry['email'], 'dev@example.com')
        # Total should be 2 (wi1 and wi2)
        self.assertEqual(entry['total'], 2)
        self.assertEqual(entry['in_progress'], 1)
        self.assertEqual(entry['completed'], 1)

    def test_global_aggregation_last_5_sprints(self):
        # Test global view (no project_id)
        request = self.factory.get('/api/dashboard/assignee-distribution/')
        force_authenticate(request, user=self.user)
        response = AssigneeDistributionView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        data = response.data
        
        # Should still exclude Old Dev
        emails = [e['email'] for e in data]
        self.assertNotIn('old@example.com', emails)
        self.assertIn('dev@example.com', emails)
