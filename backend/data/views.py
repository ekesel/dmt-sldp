from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .analytics.metrics import MetricService
from .analytics.forecasting import ForecastingService
from .models import Sprint

class MetricDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        summary = MetricService.get_dashboard_summary()
        return Response(summary)

class ForecastView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        integration_id = request.query_params.get('integration_id')
        remaining_items = int(request.query_params.get('remaining_items', 10))
        
        if not integration_id:
            return Response({"error": "integration_id is required"}, status=400)
            
        forecast = ForecastingService.simulate_delivery_dates(integration_id, remaining_items)
        if not forecast:
            return Response({"error": "No historical data for simulation"}, status=404)
            
        return Response(forecast)
