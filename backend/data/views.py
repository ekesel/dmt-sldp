from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .analytics.metrics import MetricService
from .models import AIInsight
from data.analytics.forecasting import ForecastingService
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

class AIInsightFeedbackView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        insight_id = request.data.get('insight_id')
        suggestion_id = request.data.get('suggestion_id')
        status = request.data.get('status') # accepted, rejected

        if not all([insight_id, suggestion_id, status]):
            return Response({"error": "insight_id, suggestion_id, and status are required"}, status=400)

        try:
            insight = AIInsight.objects.get(id=insight_id)
            updated = False
            for suggestion in insight.suggestions:
                if suggestion.get('id') == suggestion_id:
                    suggestion['status'] = status
                    updated = True
                    break
            
            if updated:
                insight.save()
                return Response({"status": "success"})
            else:
                return Response({"error": "Suggestion not found"}, status=404)
        except AIInsight.DoesNotExist:
            return Response({"error": "Insight not found"}, status=404)

from rest_framework import viewsets, status
from rest_framework.decorators import action
import asyncio
