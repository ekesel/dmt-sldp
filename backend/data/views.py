from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .analytics.metrics import MetricService
from .models import Sprint

class MetricDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        summary = MetricService.get_dashboard_summary()
        return Response(summary)
