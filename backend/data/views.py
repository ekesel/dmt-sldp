from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .analytics.metrics import MetricService
from .models import Sprint

class MetricDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Latest active sprint metrics
        latest_sprint = Sprint.objects.filter(status='active').last()
        velocity = {}
        if latest_sprint:
            velocity = MetricService.calculate_velocity(latest_sprint.id)
            
        avg_cycle_time = MetricService.calculate_cycle_time()
        
        return Response({
            'avg_cycle_time': str(avg_cycle_time) if avg_cycle_time else None,
            'current_sprint': velocity,
        })
