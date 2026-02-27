from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Sum, Count, Avg, F, Max, Q
import functools
import operator
from django.utils import timezone
from datetime import timedelta
from django.db import connection

from .models import WorkItem, SprintMetrics, DeveloperMetrics, AIInsight, PullRequest, Sprint
from .serializers import (
    WorkItemSerializer, SprintMetricsSerializer, DeveloperMetricsSerializer, 
    DeveloperListSerializer, AIInsightSerializer
)
from .ai.tasks import refresh_ai_insights
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
        project_id = request.query_params.get('project_id')
        remaining_items = int(request.query_params.get('remaining_items', 10))
            
        forecast = ForecastingService.simulate_delivery_dates(project_id, remaining_items)
        if not forecast:
            return Response({"error": "No historical data for simulation"}, status=404)
            
        return Response(forecast)
class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        from .analytics.metrics import MetricService
        summary = MetricService.get_dashboard_summary(project_id)
        
        # UI expects: velocity (int/float), compliance_rate (float), bugs_resolved (int), cycle_time (float)
        data = {
            "velocity": summary.get('velocity', 0),
            "compliance_rate": round(summary['compliance_rate'], 2),
            "bugs_resolved": summary['bugs_resolved'],
            "cycle_time": summary['avg_cycle_time']
        }
        return Response(data)

class VelocityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        metrics_qs = SprintMetrics.objects.order_by('-sprint_end_date')

        if project_id:
            metrics_qs = metrics_qs.filter(project_id=project_id)
        else:
            metrics_qs = metrics_qs.filter(project__isnull=True)
        metrics = metrics_qs[:5]
        
        data = []
        for m in metrics:
            # Strip date suffix like " (2/18 - 3/3)" from DB string
            base_sprint = m.sprint_name.split(' (')[0]
            
            if project_id:
                label = base_sprint
            else:
                # Find which projects contributed to this global sprint metric
                contributing_projects = SprintMetrics.objects.filter(
                    sprint_name=m.sprint_name, 
                    project__isnull=False
                ).values_list('project__name', flat=True)
                
                if contributing_projects:
                    proj_names = ", ".join(contributing_projects)
                    label = f"{base_sprint}\n({proj_names})"
                else:
                    label = base_sprint
                
            data.append({
                "sprint_name": label,
                "velocity": m.velocity,
                "total_story_points_completed": m.total_story_points_completed
            })
        
        if not metrics and SprintMetrics.objects.count() == 0:
             # Fallback: Calculate from WorkItems
             from .models import Sprint, WorkItem
             
             # Get last 5 sprints
             sprints = Sprint.objects.exclude(status='backlog').order_by('-end_date')[:5]
             data = []
             
             for sprint in sprints:
                 wi_qs = WorkItem.objects.filter(sprint=sprint, status_category='done')
                 if project_id:
                     source_config_ids = SourceConfiguration.objects.filter(project_id=project_id).values_list('id', flat=True)
                     wi_qs = wi_qs.filter(source_config_id__in=source_config_ids)
                     sprint_label = sprint.name
                 else:
                     sprint_label = f"{sprint.project.name} - {sprint.name}" if sprint.project else sprint.name
                 
                 # Using story_points sum
                 velocity = wi_qs.aggregate(Sum('story_points'))['story_points__sum'] or 0
                 
                 data.append({
                     "sprint_name": sprint_label,
                     "velocity": velocity,
                     "total_story_points_completed": velocity
                 })
             data.reverse() # Oldest to newest for graph
             return Response(data)

        data.reverse() # Oldest to newest for graph
        return Response(data)

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
        # Fetch all distinct email -> name mappings, sorted so the "best" name wins
        # Use distinct() on email, pulling the most recent/longest name
        all_metrics = DeveloperMetrics.objects.values(
            'developer_email', 'developer_name', 'project__id', 'project__name'
        ).exclude(developer_email__isnull=True).exclude(developer_email='').order_by('developer_email')
        
        # Deduplicate in Python to handle any DB inconsistencies
        dev_map = {}  # email (lowercase) -> {info dict}
        for m in all_metrics:
            email = (m['developer_email'] or '').strip().lower()
            if not email:
                continue
                
            if email not in dev_map:
                dev_map[email] = {
                    'developer_email': m['developer_email'],
                    'developer_name': m['developer_name'] or m['developer_email'],
                    'id': email,  # Use lowercase email as consistent ID
                    'projects': {}
                }
            else:
                # Prefer the longest/most descriptive name (e.g. "Arun Singh" > "arun")
                existing_name = dev_map[email]['developer_name']
                new_name = m['developer_name'] or ''
                if len(new_name) > len(existing_name) and ' ' in new_name:
                    dev_map[email]['developer_name'] = new_name
            
            # Accumulate unique projects
            if m['project__id']:
                dev_map[email]['projects'][m['project__id']] = {
                    'id': m['project__id'],
                    'name': m['project__name']
                }
        
        result = []
        for email_key, dev in sorted(dev_map.items()):
            result.append({
                'developer_email': dev['developer_email'],
                'developer_name': dev['developer_name'],
                'id': dev['id'],
                'projects': list(dev['projects'].values())
            })
            
        return Response(result)


def _get_combined_metrics(developer_email):
    
    # 1. Latest end date per project for this developer
    latest_per_project = list(
        DeveloperMetrics.objects.filter(developer_email__iexact=developer_email)
        .order_by()
        .values('project_id')
        .annotate(latest_end=Max('sprint_end_date'))
    )
    if not latest_per_project:
        return None

    # 2. Fetch those specific latest records
    filter_q = functools.reduce(
        operator.or_,
        (Q(project_id=row['project_id'], sprint_end_date=row['latest_end']) 
         for row in latest_per_project)
    )
    current_rows = list(DeveloperMetrics.objects.filter(
        developer_email__iexact=developer_email
    ).filter(filter_q))

    if not current_rows:
        return None

    # 3. Aggregate in Python for absolute accuracy
    combined = {
        'story_points_completed': sum(r.story_points_completed for r in current_rows),
        'items_completed': sum(r.items_completed for r in current_rows),
        'commits_count': sum(r.commits_count for r in current_rows),
        'prs_authored': sum(r.prs_authored for r in current_rows),
        'prs_merged': sum(r.prs_merged for r in current_rows),
        'prs_reviewed': sum(r.prs_reviewed for r in current_rows),
        'defects_attributed': sum(r.defects_attributed for r in current_rows),
        'avg_review_time_hours': sum((r.avg_review_time_hours or 0) for r in current_rows) / len(current_rows),
        'coverage_avg_percent': sum((r.coverage_avg_percent or 0) for r in current_rows) / len(current_rows),
        'ai_usage_percent': sum((r.ai_usage_percent or 0) for r in current_rows) / len(current_rows),
        'dmt_compliance_rate': sum((r.dmt_compliance_rate or 0) for r in current_rows) / len(current_rows),
        'sprint_name': 'All Projects (Current)',
        'sprint_end_date': None,
    }
    return combined

class DeveloperMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        # 'id' here is the developer_email
        project_id = request.query_params.get('project_id')
        try:
            limit = int(request.query_params.get('limit', 5))
            if limit > 50: limit = 50
        except ValueError:
            limit = 5

        metrics_qs = DeveloperMetrics.objects.filter(
            developer_email__iexact=id
        ).order_by('-sprint_end_date')

        if project_id and project_id not in ['null', 'undefined', 'all']:
            # --- Specific project ---
            metrics = metrics_qs.filter(project_id=project_id)[:limit]
            if metrics and hasattr(metrics[0], '__dict__'):
                serializer = DeveloperMetricsSerializer(metrics, many=True)
                return Response(serializer.data)
            return Response(list(metrics))

        # --- All Projects Combined ---
        combined = _get_combined_metrics(id)

        # Step 2: Historical trend — group by sprint_name across all projects
        history = list(
            metrics_qs
            .values('sprint_name', 'sprint_end_date')
            .annotate(
                story_points_completed=Sum('story_points_completed'),
                items_completed=Sum('items_completed'),
                commits_count=Sum('commits_count'),
                prs_authored=Sum('prs_authored'),
                prs_merged=Sum('prs_merged'),
                prs_reviewed=Sum('prs_reviewed'),
                avg_review_time_hours=Avg('avg_review_time_hours'),
                defects_attributed=Sum('defects_attributed'),
                coverage_avg_percent=Avg('coverage_avg_percent'),
                dmt_compliance_rate=Avg('dmt_compliance_rate'),
            )
            .order_by('-sprint_end_date')[:limit]
        )

        # Prepend combined current so metrics[0] is always the true cross-project snapshot
        result = ([combined] + history) if combined else history
        return Response(result)

class DeveloperComparisonView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        # 'id' is developer_email
        project_id = request.query_params.get('project_id')
        is_all_projects = not project_id or project_id in ['null', 'undefined', 'all']

        if is_all_projects:
            # --- All Projects Combined ---
            combined = _get_combined_metrics(id)
            if not combined:
                return Response({})

            dev_points = combined['story_points_completed']
            dev_compliance = combined['dmt_compliance_rate']

            # Team average: for each developer, sum their latest sprint per project, then average across devs
            all_devs_latest = list(
                DeveloperMetrics.objects
                .order_by()
                .values('developer_email', 'project_id')
                .annotate(latest_end=Max('sprint_end_date'))
            )
            if all_devs_latest:
                team_filter = functools.reduce(
                    operator.or_,
                    (Q(developer_email=r['developer_email'], project_id=r['project_id'], sprint_end_date=r['latest_end'])
                     for r in all_devs_latest)
                )
                per_dev = list(
                    DeveloperMetrics.objects.filter(team_filter)
                    .values('developer_email')
                    .annotate(
                        total_points=Sum('story_points_completed'),
                        avg_compliance=Avg('dmt_compliance_rate'),
                    )
                )
                team_avg_points = round(sum(d['total_points'] or 0 for d in per_dev) / len(per_dev), 1) if per_dev else 0
                team_avg_compliance = round(sum(d['avg_compliance'] or 0 for d in per_dev) / len(per_dev), 1) if per_dev else 0
            else:
                team_avg_points = 0
                team_avg_compliance = 0

            return Response({
                "velocity": {"you": dev_points, "team_avg": team_avg_points},
                "compliance": {"you": round(dev_compliance, 1), "team_avg": team_avg_compliance},
                "sprint_name": "All Projects (Current)",
            })

        else:
            # --- Specific Project ---
            last_sprint = SprintMetrics.objects.filter(
                project_id=project_id
            ).order_by('-sprint_end_date').first()

            if not last_sprint:
                return Response({})

            dev_agg = DeveloperMetrics.objects.filter(
                developer_email__iexact=id,
                sprint_name=last_sprint.sprint_name,
                project_id=project_id
            ).aggregate(
                story_points_completed=Sum('story_points_completed'),
                dmt_compliance_rate=Avg('dmt_compliance_rate')
            )
            dev_points = dev_agg['story_points_completed'] or 0
            dev_compliance = dev_agg['dmt_compliance_rate'] or 0

            # Team average from DeveloperMetrics for this sprint + project
            team_agg = DeveloperMetrics.objects.filter(
                sprint_name=last_sprint.sprint_name,
                project_id=project_id
            ).values('developer_email').annotate(
                total_points=Sum('story_points_completed')
            ).aggregate(avg_points=Avg('total_points'))
            team_avg_points = round(team_agg['avg_points'] or 0, 1)

            return Response({
                "velocity": {"you": dev_points, "team_avg": team_avg_points},
                "compliance": {
                    "you": round(dev_compliance, 1),
                    "team_avg": round(last_sprint.compliance_rate_percent, 1),
                },
                "sprint_name": last_sprint.sprint_name,
            })

class SprintListView(APIView):
    """
    Returns sprints for a given project (ordered newest first),
    or the single latest sprint across all projects if no project_id given.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')

        if project_id and project_id not in ['null', 'undefined', '']:
            from configuration.models import SourceConfiguration
            source_config_ids = SourceConfiguration.objects.filter(
                project_id=project_id
            ).values_list('id', flat=True)
            # Sprints linked to work items that belong to this project
            sprint_ids = WorkItem.objects.filter(
                source_config_id__in=source_config_ids,
                sprint__isnull=False
            ).values_list('sprint_id', flat=True).distinct()
            sprints = Sprint.objects.filter(
                id__in=sprint_ids
            ).order_by('-end_date', '-start_date')
        else:
            # All-projects mode: return the single latest sprint
            sprints = Sprint.objects.order_by('-end_date', '-start_date')[:1]

        data = [{
            'id': s.id,
            'name': s.name,
            'start_date': s.start_date,
            'end_date': s.end_date,
            'status': s.status,
        } for s in sprints]
        return Response(data)


class ComplianceFlagListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        sprint_id = request.query_params.get('sprint_id')

        # Return work items that are not compliant
        items = WorkItem.objects.filter(
            dmt_compliant=False,
            status_category__in=['todo', 'in_progress', 'done']
        ).order_by('-updated_at')

        if project_id and project_id not in ['null', 'undefined', '']:
            from configuration.models import SourceConfiguration
            source_config_ids = SourceConfiguration.objects.filter(project_id=project_id).values_list('id', flat=True)
            items = items.filter(source_config_id__in=source_config_ids)

        if sprint_id and sprint_id not in ['null', 'undefined', '']:
            items = items.filter(sprint_id=sprint_id)
        elif not sprint_id:
            # Auto: pick items from the latest sprint only
            latest_sprint = Sprint.objects.order_by('-end_date', '-start_date').first()
            if latest_sprint:
                items = items.filter(sprint_id=latest_sprint.id)

        # We can simulate "flags" by wrapping these items
        flags = []
        
        # Get project mapping for efficiency
        from configuration.models import Project, SourceConfiguration
        source_to_project = {
            s['id']: s['project__name'] 
            for s in SourceConfiguration.objects.values('id', 'project__name')
        }

        for item in items:
            project_name = source_to_project.get(item.source_config_id, "Unknown Project")
            
            # Fix assignee_name if it's "None" or null
            assignee = item.assignee_name
            if not assignee or assignee == 'None':
                assignee = item.assignee_email
            if not assignee or assignee == 'None':
                assignee = "Unassigned"

            for failure in item.compliance_failures:
                 flags.append({
                     "id": f"{item.id}-{failure}",
                     "work_item_id": item.id,
                     "work_item_title": item.title,
                     "flag_type": failure,
                     "severity": "critical" if item.status_category == 'done' else "warning",
                     "created_at": item.updated_at,
                     "project_name": project_name,
                     "assignee_name": assignee
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

class ComplianceSummaryView(APIView):
    """
    Returns KPI summary stats for the Compliance page.
    - overall_health: compliance_rate_percent from the latest sprint (same as Dashboard)
    - critical_count: non-compliant items with status_category == 'done' (live)
    - warning_count: non-compliant items with status_category in ['todo', 'in_progress'] (live)
    - compliant_items / total_items: live WorkItem counts
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        sprint_id = request.query_params.get('sprint_id')

        # --- Overall Health: use SprintMetrics (same as Dashboard) ---
        sprints_qs = SprintMetrics.objects.order_by('-sprint_end_date')
        if project_id and project_id not in ['null', 'undefined', '']:
            sprints_qs = sprints_qs.filter(project_id=project_id)
        else:
            sprints_qs = sprints_qs.filter(project__isnull=True)

        if sprint_id and sprint_id not in ['null', 'undefined', '']:
            # Match SprintMetrics by the Sprint's name
            try:
                sprint_obj = Sprint.objects.get(id=sprint_id)
                sprint_metric = sprints_qs.filter(sprint_name=sprint_obj.name).first()
            except Sprint.DoesNotExist:
                sprint_metric = None
        else:
            sprint_metric = sprints_qs.first()

        overall_health = round(sprint_metric.compliance_rate_percent, 1) if sprint_metric else 0

        # --- Live violation counts from WorkItems (filtered by sprint) ---
        items_qs = WorkItem.objects.filter(
            status_category__in=['todo', 'in_progress', 'done']
        )
        if project_id and project_id not in ['null', 'undefined', '']:
            from configuration.models import SourceConfiguration
            source_config_ids = SourceConfiguration.objects.filter(
                project_id=project_id
            ).values_list('id', flat=True)
            items_qs = items_qs.filter(source_config_id__in=source_config_ids)

        if sprint_id and sprint_id not in ['null', 'undefined', '']:
            items_qs = items_qs.filter(sprint_id=sprint_id)
        else:
            latest_sprint = Sprint.objects.order_by('-end_date', '-start_date').first()
            if latest_sprint:
                items_qs = items_qs.filter(sprint_id=latest_sprint.id)

        total = items_qs.count()
        compliant = items_qs.filter(dmt_compliant=True).count()
        non_compliant = items_qs.filter(dmt_compliant=False)
        critical_count = non_compliant.filter(status_category='done').count()
        warning_count = non_compliant.filter(status_category__in=['todo', 'in_progress']).count()

        # Final health fallback: if SprintMetrics is stale or doesn't match the live count standard, 
        # use the live calculation for the dashboard's "Overall Health" to prevent user confusion.
        live_health = round((compliant / total * 100), 1) if total > 0 else 0
        
        # If the gap between stored metric and live data is large, trust the live data.
        # This fixes the bug where health showed 7% while cards showed 79%.
        if abs(overall_health - live_health) > 5:
            overall_health = live_health

        return Response({
            "overall_health": overall_health,
            "critical_count": critical_count,
            "warning_count": warning_count,
            "total_items": total,
            "compliant_items": compliant,
        })

class AIInsightListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        insights_qs = AIInsight.objects.order_by('-created_at')

        if project_id and project_id != 'null':
            insights_qs = insights_qs.filter(project_id=project_id)
        else:
            # Return global insights (not specific to any project)
            insights_qs = insights_qs.filter(project__isnull=True)

        insights = list(insights_qs[:10])
        
        # Filter suggestions to only show 'pending' ones in the response
        for insight in insights:
            if insight.suggestions and isinstance(insight.suggestions, list):
                insight.suggestions = [s for s in insight.suggestions if s.get('status', 'pending') == 'pending']
                
        serializer = AIInsightSerializer(insights, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Trigger fresh insight generation (Streaming)
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

class AIInsightRefreshView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        project_id = request.data.get('project_id')
        schema_name = getattr(request.user, 'tenant', None).schema_name if hasattr(request.user, 'tenant') else connection.schema_name
        
        # Trigger Celery task
        refresh_ai_insights.delay(project_id=project_id, schema_name=schema_name)
        
        return Response({
            "status": "success",
            "message": "AI insight refresh triggered"
        })


class AIInsightFeedbackView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, insight_id):
        suggestion_id = request.data.get('suggestion_id')
        status = request.data.get('status')
        
        if not all([insight_id, suggestion_id, status]):
            return Response({"error": "Missing required fields"}, status=400)
            
        try:
            insight = AIInsight.objects.get(id=insight_id)
            
            # Find and update the suggestion
            updated = False
            for suggestion in insight.suggestions:
                if str(suggestion.get('id')) == str(suggestion_id):
                    suggestion['status'] = status
                    from django.utils import timezone
                    suggestion['updated_at'] = timezone.now().isoformat()
                    updated = True
                    break
                    
            if not updated:
                return Response({"error": "Suggestion not found in insight"}, status=404)
                
            insight.save(update_fields=['suggestions'])
            return Response({"success": True})
            
        except AIInsight.DoesNotExist:
            return Response({"error": "AIInsight not found"}, status=404)


class AssigneeDistributionView(APIView):
    """
    GET /api/dashboard/assignee-distribution/
    Returns per-assignee workload breakdown for the given project (or globally).
    Prefers linked User records but falls back to raw assignee_email strings.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')

        from .models import Sprint, SprintMetrics
        from configuration.models import SourceConfiguration
        from django.db.models import Q
        from collections import defaultdict

        # Identify last 5 sprints
        try:
            if project_id and project_id not in ['null', 'undefined']:
                source_ids = list(SourceConfiguration.objects.filter(project_id=project_id).values_list('id', flat=True))
                
                # Preferred: Get from pre-calculated metrics
                relevant_sprint_names = list(SprintMetrics.objects.filter(
                    project_id=project_id
                ).order_by('-sprint_end_date').values_list('sprint_name', flat=True)[:5])
                
                if not relevant_sprint_names:
                    # Fallback: Get from Sprint model based on work items in this project
                    relevant_sprint_names = list(Sprint.objects.filter(
                        work_items__source_config_id__in=source_ids
                    ).distinct().order_by('-end_date').values_list('name', flat=True)[:5])
                
                if relevant_sprint_names:
                    work_items = WorkItem.objects.filter(
                        source_config_id__in=source_ids, 
                        sprint__name__in=relevant_sprint_names
                    )
                else:
                    # If NO sprints found at all, we filter to empty to be safe (no data for last 5 sprints)
                    work_items = WorkItem.objects.filter(source_config_id__in=source_ids).none()
            else:
                # Global view
                relevant_sprint_names = list(SprintMetrics.objects.filter(
                    project__isnull=True
                ).order_by('-sprint_end_date').values_list('sprint_name', flat=True)[:5])
                
                if not relevant_sprint_names:
                    relevant_sprint_names = list(Sprint.objects.all().order_by('-end_date').values_list('name', flat=True)[:5])
                
                if relevant_sprint_names:
                    work_items = WorkItem.objects.filter(sprint__name__in=relevant_sprint_names)
                else:
                    work_items = WorkItem.objects.none()
        except Exception:
            work_items = WorkItem.objects.none()

        # Use a dict to aggregate stats by email
        # Key: lowercased email
        # Value: { 'name': str, 'email': str, 'id': int|None, 'is_portal_user': bool, 'total': int, 'in_progress': int, 'completed': int, 'durations': list }
        aggregation = {}

        # 1. Process Resolved Assignees
        resolved_rows = (
            work_items.filter(resolved_assignee__isnull=False)
            .values('resolved_assignee__id', 'resolved_assignee__first_name',
                    'resolved_assignee__last_name', 'resolved_assignee__email',
                    'resolved_assignee__is_active', 'status_category', 'resolved_at', 'started_at')
        )

        for row in resolved_rows:
            email = (row['resolved_assignee__email'] or '').lower().strip()
            if not email:
                continue

            if email not in aggregation:
                name = f"{row['resolved_assignee__first_name']} {row['resolved_assignee__last_name']}".strip()
                aggregation[email] = {
                    'id': row['resolved_assignee__id'],
                    'name': name or email,
                    'email': email,
                    'is_portal_user': row['resolved_assignee__is_active'],
                    'total': 0,
                    'in_progress': 0,
                    'completed': 0,
                    'durations': []
                }
            
            agg = aggregation[email]
            agg['total'] += 1
            if row['status_category'] == 'in_progress':
                agg['in_progress'] += 1
            elif row['status_category'] == 'done':
                agg['completed'] += 1
                if row['resolved_at'] and row['started_at']:
                    duration = (row['resolved_at'] - row['started_at']).total_seconds() / 86400.0
                    agg['durations'].append(duration)

        # 2. Process Fallback Assignees (unlinked)
        fallback_rows = (
            work_items.filter(resolved_assignee__isnull=True, assignee_email__isnull=False)
            .exclude(assignee_email='')
            .values('assignee_email', 'assignee_name', 'status_category', 'started_at', 'resolved_at')
        )

        for row in fallback_rows:
            email = (row['assignee_email'] or '').lower().strip()
            if not email:
                continue

            if email not in aggregation:
                aggregation[email] = {
                    'id': None,
                    'name': row['assignee_name'] or email,
                    'email': email,
                    'is_portal_user': False,
                    'total': 0,
                    'in_progress': 0,
                    'completed': 0,
                    'durations': []
                }
            
            agg = aggregation[email]
            agg['total'] += 1
            if row['status_category'] == 'in_progress':
                agg['in_progress'] += 1
            elif row['status_category'] == 'done':
                agg['completed'] += 1
                if row['resolved_at'] and row['started_at']:
                    duration = (row['resolved_at'] - row['started_at']).total_seconds() / 86400.0
                    agg['durations'].append(duration)

        # 3. Finalize result list
        result = []
        for email, agg in aggregation.items():
            avg_ct = round(sum(agg['durations']) / len(agg['durations']), 1) if agg['durations'] else None
            result.append({
                'id': agg['id'],
                'name': agg['name'],
                'email': agg['email'],
                'is_portal_user': agg['is_portal_user'],
                'total': agg['total'],
                'in_progress': agg['in_progress'],
                'completed': agg['completed'],
                'avg_cycle_time_days': avg_ct,
            })

        # Sort by most total work first
        result.sort(key=lambda x: x['total'], reverse=True)
        return Response(result)
