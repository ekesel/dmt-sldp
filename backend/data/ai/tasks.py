from celery import shared_task
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q, F
from ..models import AIInsight, WorkItem
from configuration.models import SourceConfiguration, Project
from tenants.models import Tenant
from django.db import connection
from .service import GeminiAIProvider, KimiAIProvider
from core.celery_utils import tenant_aware_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@shared_task(queue='ai_insights')
@tenant_aware_task
def refresh_ai_insights(project_id=None, schema_name=None):
    """
    Refreshes AI insights for a specific project OR a global one for all projects.
    """
    tenant = Tenant.objects.get(schema_name=connection.schema_name)
    channel_layer = get_channel_layer()

    try:
        # Signal Progress: Stage 1 - Gathering (25%)
        try:
            async_to_sync(channel_layer.group_send)(
                f"telemetry_{tenant.slug}",
                {
                    "type": "telemetry_update",
                    "message": {
                        "type": "ai_insight_progress",
                        "project_id": project_id,
                        "progress": 25,
                        "status": "Gathering project metrics..."
                    }
                }
            )
        except Exception: pass

        # 1. Aggregate real metrics
        if project_id:
            try:
                project = Project.objects.get(id=project_id)
                source_ids = SourceConfiguration.objects.filter(project=project).values_list('id', flat=True)
                work_items = WorkItem.objects.filter(source_config_id__in=source_ids)
                target_name = f"Project {project.name}"
            except Project.DoesNotExist:
                return f"Project {project_id} not found."
        else:
            # Global insights for all projects
            work_items = WorkItem.objects.all()
            target_name = "Global All Projects"
            project = None

        total_count = work_items.count()
        if total_count == 0:
            return f"No work items found for {target_name}. Skipping AI insight."

        # --- Use SprintMetrics for cycle time & compliance (same source as the KPI dashboard) ---
        from ..models import SprintMetrics
        sprints_qs = SprintMetrics.objects.order_by('-sprint_end_date')
        if project_id:
            sprints_qs = sprints_qs.filter(project_id=project_id)
        else:
            sprints_qs = sprints_qs.filter(project__isnull=True)
        last_5 = list(sprints_qs[:5])

        if last_5:
            # Filter out None values before calculating average
            cycle_times = [m.avg_cycle_time_days for m in last_5 if m.avg_cycle_time_days is not None]
            if cycle_times:
                avg_cycle_time_days = round(sum(cycle_times) / len(cycle_times), 1)
                avg_cycle_time_str = f"{avg_cycle_time_days} days"
            else:
                avg_cycle_time_str = "N/A"
            
            # Use the latest sprint's compliance rate (more accurate than all-time)
            compliance_rate = last_5[0].compliance_rate_percent or 0
        else:
            # Fallback: derive from work items if no sprint metrics exist
            compliant_count = work_items.filter(dmt_compliant=True).count()
            compliance_rate = (compliant_count / total_count) * 100 if total_count > 0 else 0
            resolved = work_items.filter(resolved_at__isnull=False, started_at__isnull=False)
            durations = [
                (i.resolved_at - i.started_at).total_seconds() / 86400.0
                for i in resolved if i.resolved_at and i.started_at
            ]
            avg_cycle_time_days = round(sum(durations) / len(durations), 1) if durations else 0
            avg_cycle_time_str = f"{avg_cycle_time_days} days" if avg_cycle_time_days else "N/A"

        high_risk_count = work_items.filter(dmt_compliant=False).count()

        # 1.1 Collect Team Optimization Data
        stagnant_items = work_items.filter(
            status_category='in_progress',
            updated_at__lt=timezone.now() - timedelta(days=5)
        ).values('external_id', 'title', 'assignee_email', 'assignee_name')

        # Rich Assignee Distribution (Workload)
        assignee_stats = []
        seen_emails = set()
        
        # 1. Linked Users
        linked_users_qs = work_items.filter(resolved_assignee__isnull=False).values(
            'resolved_assignee__first_name', 'resolved_assignee__last_name', 'resolved_assignee__email', 'resolved_assignee__id'
        ).annotate(
            in_progress=Count('id', filter=Q(status_category='in_progress')),
            completed=Count('id', filter=Q(status_category='done')),
        )
        
        for row in linked_users_qs:
            name = f"{row['resolved_assignee__first_name']} {row['resolved_assignee__last_name']}".strip()
            email = row['resolved_assignee__email']
            if email:
                seen_emails.add(email)
            
            # Calculate individual cycle time for context
            durations = [
                (i.resolved_at - i.started_at).total_seconds() / 86400.0
                for i in work_items.filter(
                    resolved_assignee_id=row['resolved_assignee__id'],
                    status_category='done',
                    resolved_at__isnull=False,
                    started_at__isnull=False
                )
            ]
            avg_ct = round(sum(durations) / len(durations), 1) if durations else None
            
            assignee_stats.append({
                "name": name or email,
                "email": email,
                "in_progress": row['in_progress'],
                "completed": row['completed'],
                "avg_cycle_time": avg_ct
            })

        # 2. Unlinked strings (fallback)
        unlinked_qs = work_items.filter(resolved_assignee__isnull=True, assignee_email__isnull=False).exclude(assignee_email='').values(
            'assignee_email', 'assignee_name'
        ).annotate(
            in_progress=Count('id', filter=Q(status_category='in_progress')),
            completed=Count('id', filter=Q(status_category='done')),
        )
        
        for row in unlinked_qs:
            email = row['assignee_email']
            if email in seen_emails:
                continue
            seen_emails.add(email)
            
            assignee_stats.append({
                "name": row['assignee_name'] or email,
                "email": email,
                "in_progress": row['in_progress'],
                "completed": row['completed'],
                "avg_cycle_time": None
            })

        metrics = {
            "compliance_rate": round(compliance_rate, 2),
            "avg_cycle_time": avg_cycle_time_str,
            "high_risk_count": high_risk_count,
            "stagnant_items": list(stagnant_items),
            "assignee_distribution": assignee_stats,
            "velocity_history": [
                {
                    "sprint": m.sprint_name,
                    "velocity": m.velocity,
                    "compliance": m.compliance_rate_percent
                } for m in last_5
            ],
            "developer_history": [] # To be populated below
        }

        # Fetch Developer History for the last 5 sprints
        from ..models import DeveloperMetrics
        relevant_dev_emails = [a['email'] for a in assignee_stats if a['email']]
        dev_metrics = DeveloperMetrics.objects.filter(
            developer_email__in=relevant_dev_emails,
            sprint_name__in=[m.sprint_name for m in last_5]
        ).values('developer_email', 'sprint_name', 'items_completed')
        
        metrics['developer_history'] = list(dev_metrics)

        # Signal Progress: Stage 2 - Calling AI (60%)
        try:
            async_to_sync(channel_layer.group_send)(
                f"telemetry_{tenant.slug}",
                {
                    "type": "telemetry_update",
                    "message": {
                        "type": "ai_insight_progress",
                        "project_id": project_id,
                        "progress": 60,
                        "status": "Consulting AI expert..."
                    }
                }
            )
        except Exception: pass

        # 2. Call real AI service
        if tenant.ai_provider == Tenant.AI_PROVIDER_KIMI:
            ai_provider = KimiAIProvider(api_key=tenant.ai_api_key, model_name=tenant.ai_model, base_url=tenant.ai_base_url)
        else:
            ai_provider = GeminiAIProvider()

        response_data = ai_provider.generate_optimization_insights(metrics)

        # Signal Progress: Stage 3 - Finalizing (90%)
        try:
            async_to_sync(channel_layer.group_send)(
                f"telemetry_{tenant.slug}",
                {
                    "type": "telemetry_update",
                    "message": {
                        "type": "ai_insight_progress",
                        "project_id": project_id,
                        "progress": 90,
                        "status": "Finalizing suggestions..."
                    }
                }
            )
        except Exception: pass

        # 3. Store result
        insight = AIInsight.objects.create(
            project=project,
            summary=response_data.get("summary", ""),
            suggestions=response_data.get("suggestions", []),
            forecast=response_data.get("forecast", "")
        )
        
        # 4. Signal dashboard that AI insights have been updated
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"telemetry_{tenant.slug}",
                {
                    "type": "telemetry_update",
                    "message": {
                        "type": "ai_insight_update",
                        "project_id": project_id
                    }
                }
            )
        except Exception as e:
            print(f"Failed to broadcast AI insight update: {e}")

    except Exception as e:
        print(f"Error in refresh_ai_insights: {e}")
        # Notify of failure
        try:
            async_to_sync(channel_layer.group_send)(
                f"telemetry_{tenant.slug}",
                {
                    "type": "telemetry_update",
                    "message": {
                        "type": "ai_insight_progress",
                        "project_id": project_id,
                        "progress": 0,
                        "status": f"Error: {str(e)}"
                    }
                }
            )
        except Exception: pass
        raise e

    return f"AI Insight generated for {target_name} (ID: {insight.id})"
