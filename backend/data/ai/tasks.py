from celery import shared_task
from django.utils import timezone
from ..models import Integration, AIInsight

@shared_task
def refresh_ai_insights(integration_id):
    """
    Refreshes AI insights for a specific integration.
    Currently uses a mock implementation to verify wiring before Plan 2.2.
    """
    try:
        integration = Integration.objects.get(id=integration_id)
    except Integration.DoesNotExist:
        return f"Integration {integration_id} not found."

    # Create a mock insight
    insight = AIInsight.objects.create(
        integration=integration,
        summary="DMT Compliance check is stable. High-risk items detected in recent stories.",
        suggestions=[
            {
                "title": "Review PR Links",
                "impact": "High",
                "description": "3 stories are missing PR links which impacts traceability."
            }
        ],
        forecast="High probability of meeting sprint goals if PR compliance improved."
    )
    
    return f"Mock AI Insight generated for {integration.name} (ID: {insight.id})"
