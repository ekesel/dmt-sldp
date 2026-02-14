from django.test import TestCase
from django.utils import timezone
from data.models import Integration, WorkItem
from data.analytics.forecasting import ForecastingService
from datetime import timedelta

class ForecastingTestCase(TestCase):
    def setUp(self):
        self.integration = Integration.objects.create(name="Test", source_type="jira")
        # Create 10 historical items with 3 days cycle time
        for i in range(10):
            created = timezone.now() - timedelta(days=10)
            resolved = created + timedelta(days=3)
            WorkItem.objects.create(
                external_id=f"ITEM-{i}",
                integration=self.integration,
                created_at=created,
                resolved_at=resolved,
                status='done'
            )

    def test_forecast_calculation(self):
        forecast = ForecastingService.simulate_delivery_dates(self.integration.id, remaining_items=10, num_simulations=100)
        self.assertIsNotNone(forecast)
        self.assertIn('85', forecast)
        # 10 items * 3 days = 30 days from now
        forecast_date = timezone.datetime.fromisoformat(forecast['85'])
        expected_date = timezone.now() + timedelta(days=30)
        # Using 3 days tolerance for run time and sampling jitter
        self.assertLess(abs((forecast_date - expected_date).days), 3)
