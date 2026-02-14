import numpy as np
from datetime import timedelta
from django.utils import timezone
from ..models import WorkItem
from django.db.models import F

class ForecastingService:
    @staticmethod
    def get_historical_cycle_times(integration_id, limit=100):
        """
        Calculates cycle times (in days) for the last N resolved work items.
        """
        items = WorkItem.objects.filter(
            integration_id=integration_id,
            resolved_at__isnull=False,
            created_at__isnull=False
        ).order_by('-resolved_at')[:limit]
        
        cycle_times = []
        for item in items:
            duration = item.resolved_at - item.created_at
            days = duration.total_seconds() / 86400  # Convert to fractional days
            if days > 0:
                cycle_times.append(days)
        
        return cycle_times

    @staticmethod
    def simulate_delivery_dates(integration_id, remaining_items, num_simulations=10000):
        """
        Runs Monte Carlo simulations to predict completion time for M items.
        """
        historical_times = ForecastingService.get_historical_cycle_times(integration_id)
        
        if not historical_times:
            # Fallback if no history exists
            return None
            
        # Empirical sampling: pick random durations from our history
        # Shape: (simulations, remaining_items)
        simulated_durations = np.random.choice(historical_times, size=(num_simulations, remaining_items))
        
        # Total time for each simulation
        total_times = simulated_durations.sum(axis=1)
        
        # Calculate percentiles
        percentiles = {
            50: np.percentile(total_times, 50),
            75: np.percentile(total_times, 75),
            85: np.percentile(total_times, 85),
            95: np.percentile(total_times, 95)
        }
        
        # Convert offset days to absolute dates
        now = timezone.now()
        forecast = {}
        for p, days in percentiles.items():
            forecast[str(p)] = (now + timedelta(days=float(days))).isoformat()
            
        return forecast
