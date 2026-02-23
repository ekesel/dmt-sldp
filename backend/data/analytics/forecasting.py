import numpy as np
from datetime import timedelta
from django.utils import timezone
from ..models import WorkItem
from django.db.models import F

class ForecastingService:
    @staticmethod
    def get_historical_cycle_times(project_id=None, limit=200):
        """
        Calculates cycle times (in days) for the last N resolved work items.
        """
        from configuration.models import SourceConfiguration
        
        items = WorkItem.objects.filter(
            resolved_at__isnull=False,
            created_at__isnull=False
        ).order_by('-resolved_at')
        
        if project_id:
            source_config_ids = SourceConfiguration.objects.filter(project_id=project_id).values_list('id', flat=True)
            items = items.filter(source_config_id__in=source_config_ids)
            
        items = items[:limit]
        
        cycle_times = []
        for item in items:
            duration = item.resolved_at - item.created_at
            days = duration.total_seconds() / 86400  # Convert to fractional days
            if days > 0:
                cycle_times.append(days)
        
        return cycle_times

    @staticmethod
    def simulate_delivery_dates(project_id=None, remaining_items=10, num_simulations=10000):
        """
        Runs Monte Carlo simulations to predict completion time for M items.
        """
        historical_times = ForecastingService.get_historical_cycle_times(project_id)
        
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
