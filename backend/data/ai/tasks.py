from celery import shared_task
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, F, Count
from ..models import AIInsight, WorkItem
from configuration.models import SourceConfiguration
from .service import GeminiAIProvider
from core.celery_utils import tenant_aware_task

@shared_task(queue='ai_insights')
@tenant_aware_task
def refresh_ai_insights(source_id, schema_name=None):
    """
    Refreshes AI insights for a specific source using Google Gemini.
    """
    try:
        source = SourceConfiguration.objects.get(id=source_id)
    except SourceConfiguration.DoesNotExist:
        return f"Source {source_id} not found."

    # 1. Aggregate real metrics
    work_items = WorkItem.objects.filter(source_config_id=source.id)
    total_count = work_items.count()
    if total_count == 0:
        return f"No work items found for {source.name}. Skipping AI insight."

    compliant_count = work_items.filter(is_compliant=True).count()
    compliance_rate = (compliant_count / total_count) * 100
    
    # Calculate avg cycle time (days) for resolved items
    resolved_items = work_items.filter(resolved_at__isnull=False)
    avg_cycle_time_days = resolved_items.annotate(
        duration=F('resolved_at') - F('created_at')
    ).aggregate(avg_duration=Avg('duration'))['avg_duration']
    
    avg_cycle_time_str = f"{avg_cycle_time_days.days} days" if avg_cycle_time_days else "N/A"
    high_risk_count = work_items.filter(is_compliant=False).count()

    # 1.1 Collect Team Optimization Data
    stagnant_items = work_items.filter(
        status='in_progress',
        updated_at__lt=timezone.now() - timedelta(days=5)
    ).values('external_id', 'title', 'assignee_email')
    
    assignee_distribution = work_items.filter(status='in_progress').values('assignee_email').annotate(
        count=Count('id')
    )

    metrics = {
        "compliance_rate": round(compliance_rate, 2),
        "avg_cycle_time": avg_cycle_time_str,
        "high_risk_count": high_risk_count,
        "stagnant_items": list(stagnant_items),
        "assignee_distribution": list(assignee_distribution)
    }

    # 2. Call real AI service
    ai_provider = GeminiAIProvider()
    # Wave 1: Combine compliance and team health or call separately
    # For now, we enhance the primary provider to handle the expanded metrics
    response_data = ai_provider.generate_optimization_insights(metrics)

    # 3. Store result
    insight = AIInsight.objects.create(
        source_config_id=source.id,
        summary=response_data.get("summary", ""),
        suggestions=response_data.get("suggestions", []),
        forecast=response_data.get("forecast", "")
    )
    
    return f"AI Insight generated for {source.name} (ID: {insight.id})"
