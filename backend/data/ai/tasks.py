from celery import shared_task
from django.utils import timezone
from django.db.models import Avg, F
from ..models import Integration, AIInsight, WorkItem
from .service import GeminiAIProvider
from core.celery_utils import tenant_aware_task

@shared_task(queue='ai_insights')
@tenant_aware_task
def refresh_ai_insights(integration_id, schema_name=None):
    """
    Refreshes AI insights for a specific integration using Google Gemini.
    """
    try:
        integration = Integration.objects.get(id=integration_id)
    except Integration.DoesNotExist:
        return f"Integration {integration_id} not found."

    # 1. Aggregate real metrics
    work_items = WorkItem.objects.filter(integration=integration)
    total_count = work_items.count()
    if total_count == 0:
        return f"No work items found for {integration.name}. Skipping AI insight."

    compliant_count = work_items.filter(is_compliant=True).count()
    compliance_rate = (compliant_count / total_count) * 100
    
    # Calculate avg cycle time (days) for resolved items
    resolved_items = work_items.filter(resolved_at__isnull=False)
    avg_cycle_time_days = resolved_items.annotate(
        duration=F('resolved_at') - F('created_at')
    ).aggregate(avg_duration=Avg('duration'))['avg_duration']
    
    avg_cycle_time_str = f"{avg_cycle_time_days.days} days" if avg_cycle_time_days else "N/A"
    high_risk_count = work_items.filter(is_compliant=False).count()

    metrics = {
        "compliance_rate": round(compliance_rate, 2),
        "avg_cycle_time": avg_cycle_time_str,
        "high_risk_count": high_risk_count
    }

    # 2. Call real AI service
    ai_provider = GeminiAIProvider()
    response_data = ai_provider.generate_compliance_insights(metrics)

    # 3. Store result
    insight = AIInsight.objects.create(
        integration=integration,
        summary=response_data.get("summary", ""),
        suggestions=response_data.get("suggestions", []),
        forecast=response_data.get("forecast", "")
    )
    
    return f"AI Insight generated for {integration.name} (ID: {insight.id})"
