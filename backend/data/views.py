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
from configuration.models import SourceConfiguration

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
        project_id = request.query_params.get('project_id')
        
        # Base querysets
        sprints = SprintMetrics.objects.order_by('-sprint_end_date')
        
        # If project_id provided, filter Sprints based on association via WorkItems
        if project_id:
            # 1. Get Source Config IDs for this project (Cross-schema query)
            source_config_ids = SourceConfiguration.objects.filter(project_id=project_id).values_list('id', flat=True)
            
            # 2. Find sprints that have work items from these sources
            from .models import WorkItem
            relevant_sprint_names = WorkItem.objects.filter(
                source_config_id__in=source_config_ids, 
                sprint__isnull=False
            ).values_list('sprint__name', flat=True).distinct()
            
            current_sprint = sprints.filter(sprint_name__in=relevant_sprint_names).first()
        else:
            current_sprint = sprints.first()
        
        if not current_sprint:
            # Fallback: Calculate metrics dynamically from WorkItems if no SprintMetrics exist
            from django.db.models import Sum, Avg, F, Q
            from .models import WorkItem, Sprint
            
            # Base WorkItem Query
            wi_qs = WorkItem.objects.all()
            if project_id:
               source_config_ids = SourceConfiguration.objects.filter(project_id=project_id).values_list('id', flat=True)
               wi_qs = wi_qs.filter(source_config_id__in=source_config_ids)

            # 1. Velocity (Active Sprint)
            active_sprint = Sprint.objects.filter(status='active').first()
            velocity = 0
            if active_sprint:
                completed_in_sprint = wi_qs.filter(sprint=active_sprint, status_category='done')
                # Assuming 'story_points' field exists in raw_source_data or we use a count
                # For now, simplistic count as story points field isn't in WorkItem model definition above
                velocity = completed_in_sprint.count() 

            # 2. Compliance Rate
            total_items = wi_qs.count()
            compliant_items = wi_qs.filter(dmt_compliant=True).count()
            compliance_rate = (compliant_items / total_items * 100) if total_items > 0 else 0

            # 3. Defects (Bugs)
            defects = wi_qs.filter(item_type='bug').count()

            # 4. Cycle Time (Mocked/Simplified)
            cycle_time = 3.4 # Placeholder until we have resolved_at - started_at logic

            data = {
                "velocity": velocity,
                "compliance_rate": round(compliance_rate, 1),
                "defects": defects,
                "cycle_time": cycle_time
            }
            return Response(data)

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
        project_id = request.query_params.get('project_id')
        metrics_qs = SprintMetrics.objects.order_by('-sprint_end_date')

        if project_id:
            source_config_ids = SourceConfiguration.objects.filter(project_id=project_id).values_list('id', flat=True)
            from .models import WorkItem
            relevant_sprint_names = WorkItem.objects.filter(
                source_config_id__in=source_config_ids, 
                sprint__isnull=False
            ).values_list('sprint__name', flat=True).distinct()
            metrics_qs = metrics_qs.filter(sprint_name__in=relevant_sprint_names)

        metrics = metrics_qs[:5]
        
        if not metrics and SprintMetrics.objects.count() == 0:
             # Fallback: Calculate from WorkItems
             from .models import Sprint, WorkItem
             
             # Get last 5 sprints
             sprints = Sprint.objects.order_by('-end_date')[:5]
             data = []
             
             for sprint in sprints:
                 wi_qs = WorkItem.objects.filter(sprint=sprint, status_category='done')
                 if project_id:
                     source_config_ids = SourceConfiguration.objects.filter(project_id=project_id).values_list('id', flat=True)
                     wi_qs = wi_qs.filter(source_config_id__in=source_config_ids)
                 
                 # Using count as proxy for velocity if points missing
                 velocity = wi_qs.count() 
                 
                 data.append({
                     "sprint_name": sprint.name,
                     "velocity": velocity,
                     "total_story_points_completed": velocity
                 })
             return Response(data)

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
        project_id = request.query_params.get('project_id')
        metrics_qs = SprintMetrics.objects.order_by('-sprint_end_date')

        if project_id:
            source_config_ids = SourceConfiguration.objects.filter(project_id=project_id).values_list('id', flat=True)
            from .models import WorkItem
            relevant_sprint_names = WorkItem.objects.filter(
                source_config_id__in=source_config_ids, 
                sprint__isnull=False
            ).values_list('sprint__name', flat=True).distinct()
            metrics_qs = metrics_qs.filter(sprint_name__in=relevant_sprint_names)

        metrics = metrics_qs[:5]
        
        if not metrics and SprintMetrics.objects.count() == 0:
             # Fallback: Calculate from WorkItems
             from .models import Sprint, WorkItem
             sprints = Sprint.objects.order_by('-end_date')[:5]
             data = []
             
             for sprint in sprints:
                 wi_qs = WorkItem.objects.filter(sprint=sprint)
                 if project_id:
                     source_config_ids = SourceConfiguration.objects.filter(project_id=project_id).values_list('id', flat=True)
                     wi_qs = wi_qs.filter(source_config_id__in=source_config_ids)
                 
                 total = wi_qs.count()
                 compliant = wi_qs.filter(dmt_compliant=True).count()
                 rate = (compliant / total * 100) if total > 0 else 0
                 
                 data.append({
                     "sprint": sprint.name,
                     "rate": round(rate, 1)
                 })
             return Response(data)

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
        project_id = request.query_params.get('project_id')
        insights_qs = AIInsight.objects.order_by('-created_at')

        if project_id:
            # AIInsights are linked to source_config
            insights_qs = insights_qs.filter(source_config_id__in=
                SourceConfiguration.objects.filter(project_id=project_id).values('id')
            )

        insights = insights_qs[:10]
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
