from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Sum, Count, Avg, F
from django.utils import timezone
from datetime import timedelta
from django.db import connection

from .models import WorkItem, SprintMetrics, DeveloperMetrics, AIInsight, PullRequest
from .serializers import (
    WorkItemSerializer, SprintMetricsSerializer, DeveloperMetricsSerializer, 
    DeveloperListSerializer, AIInsightSerializer
)
from core.utils.ai_client import AIClient
from tenants.models import Tenant
from .analytics.metrics import MetricService
from .analytics.forecasting import ForecastingService

# --- Restored Views ---
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
# ----------------------

class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Scope to current tenant via schema or request context
        # Assumes django-tenants middleware sets connection.schema_name
        
        # Get current active sprint metrics if available
        current_sprint = SprintMetrics.objects.order_by('-sprint_end_date').first()
        
        if not current_sprint:
            return Response({})

        data = {
            "velocity": current_sprint.velocity,
            "compliance_rate": current_sprint.compliance_rate_percent,
            "defects": current_sprint.defects_found_post_release,
            "cycle_time": current_sprint.avg_cycle_time_days
        }
        return Response(data)

class VelocityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        metrics = SprintMetrics.objects.order_by('-sprint_end_date')[:5]
        serializer = SprintMetricsSerializer(metrics, many=True)
        return Response(serializer.data)

class ThroughputView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        metrics = SprintMetrics.objects.order_by('-sprint_end_date')[:5]
        data = [{
            "sprint": m.sprint_name,
            "stories": m.stories_completed,
            "bugs": m.bugs_completed,
            "total": m.items_completed
        } for m in metrics]
        return Response(data)

class DefectDensityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        metrics = SprintMetrics.objects.order_by('-sprint_end_date')[:5]
        data = [{
            "sprint": m.sprint_name,
            "density": m.defect_density_per_100_points
        } for m in metrics]
        return Response(data)

class ComplianceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        metrics = SprintMetrics.objects.order_by('-sprint_end_date')[:5]
        data = [{
            "sprint": m.sprint_name,
            "rate": m.compliance_rate_percent
        } for m in metrics]
        return Response(data)

class BlockedItemsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = WorkItem.objects.filter(is_blocked=True, status_category__in=['todo', 'in_progress'])
        serializer = WorkItemSerializer(items, many=True)
        return Response(serializer.data)

class PRHealthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        metrics = SprintMetrics.objects.order_by('-sprint_end_date')[:5]
        data = [{
            "sprint": m.sprint_name,
            "avg_review_time": m.avg_time_to_first_review_hours,
            "reviewed_percent": m.prs_with_reviews_percent
        } for m in metrics]
        return Response(data)

class DeveloperListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Aggregate unique developers from metrics
        # Ideally we would have a Developer model, but using metrics for now as per schema
        devs = DeveloperMetrics.objects.values(
            'developer_source_id', 'developer_name', 'developer_email'
        ).distinct()
        return Response(devs)

class DeveloperMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        metrics = DeveloperMetrics.objects.filter(developer_source_id=id).order_by('-sprint_end_date')[:5]
        serializer = DeveloperMetricsSerializer(metrics, many=True)
        return Response(serializer.data)

class DeveloperComparisonView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        # Compare developer vs team avg for last sprint
        last_sprint = SprintMetrics.objects.order_by('-sprint_end_date').first()
        if not last_sprint:
            return Response({})
            
        dev_metric = DeveloperMetrics.objects.filter(
            developer_source_id=id, 
            sprint_name=last_sprint.sprint_name
        ).first()
        
        if not dev_metric:
            return Response({})
            
        # Simplistic comparison
        data = {
            "velocity": {
                "you": dev_metric.story_points_completed,
                "team_avg": last_sprint.velocity / 5 # Placeholder divisor
            },
            "compliance": {
                "you": dev_metric.dmt_compliance_rate,
                "team_avg": last_sprint.compliance_rate_percent
            }
        }
        return Response(data)

class ComplianceFlagListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Return work items that are not compliant and not done
        items = WorkItem.objects.filter(
            dmt_compliant=False, 
            status_category__in=['todo', 'in_progress', 'done']
        ).order_by('-updated_at')
        
        # We can simulate "flags" by wrapping these items
        flags = []
        for item in items:
            for failure in item.compliance_failures:
                 flags.append({
                     "id": f"{item.id}-{failure}",
                     "work_item_id": item.id,
                     "work_item_title": item.title,
                     "flag_type": failure,
                     "severity": "critical" if item.status_category == 'done' else "warning",
                     "created_at": item.updated_at
                 })
                 
        return Response(flags)

class ComplianceFlagResolveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        # ID format: "{item_id}-{failure_type}"
        try:
            item_id, failure_type = id.split('-')
            # Resolution logic depends on failure type. 
            # For now, we might just mark it as exception approved if user has rights
            item = WorkItem.objects.get(id=item_id)
            item.dmt_exception_required = True
            item.dmt_exception_reason = "Manual resolution via portal"
            item.exception_approver = request.user.username
            item.save()
            return Response({"status": "resolved"})
        except Exception as e:
            return Response({"error": str(e)}, status=400)

class AIInsightListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        insights = AIInsight.objects.order_by('-created_at')[:10]
        serializer = AIInsightSerializer(insights, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Trigger fresh insight generation
        # Get tenant config
        try:
            tenant = Tenant.objects.get(schema_name=connection.schema_name)
            if not tenant.ai_api_key:
                return Response({"error": "AI not configured"}, status=400)
                
            client = AIClient(tenant.ai_api_key, tenant.ai_base_url, tenant.ai_model)
            
            # Streaming response
            def event_stream():
                messages = request.data.get('messages', [])
                for chunk in client.stream_chat(messages):
                    yield f"data: {chunk}\n\n"
            
            from django.http import StreamingHttpResponse
            return StreamingHttpResponse(event_stream(), content_type='text/event-stream')
            
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant context missing"}, status=400)

class AIInsightFeedbackView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request):
        # Existing implementation logic
        pass
