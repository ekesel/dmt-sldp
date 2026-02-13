from django.db.models.signals import post_save
from django.dispatch import receiver, Signal
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import connection
from .models import WorkItem, AIInsight

# Custom signals
data_sync_completed = Signal()

@receiver(post_save, sender=WorkItem)
def work_item_telemetry_signal(sender, instance, **kwargs):
    """
    Broadcasts real-time metrics update when a WorkItem is saved.
    """
    channel_layer = get_channel_layer()
    schema_name = connection.schema_name
    
    # We use schema_name as the tenant identifier for the group
    group_name = f"tenant_{schema_name}"
    
    # In a real implementation, we'd calculate the updated metrics here
    # For now, we signal that an update happened.
    message = {
        "type": "metrics_update",
        "data": {
            "work_item_id": instance.id,
            "status": instance.status,
            "is_compliant": instance.is_compliant,
            "timestamp": str(instance.updated_at)
        }
    }
    
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "telemetry_update",
            "message": message
        }
    )

@receiver(post_save, sender=AIInsight)
def ai_insight_telemetry_signal(sender, instance, created, **kwargs):
    """
    Broadcasts notification when a new AI Insight is generated.
    """
    if not created:
        return

    channel_layer = get_channel_layer()
    schema_name = connection.schema_name
    group_name = f"tenant_{schema_name}"
    
    message = {
        "type": "insight_ready",
        "data": {
            "insight_id": instance.id,
            "summary": instance.summary[:100] + "...",
            "created_at": str(instance.created_at)
        }
    }
    
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "telemetry_update",
            "message": message
        }
    )

@receiver(data_sync_completed)
def trigger_ai_refresh(sender, integration_id, schema_name, **kwargs):
    """
    Triggers AI insight refresh when a data sync completes.
    """
    from .ai.tasks import refresh_ai_insights
    refresh_ai_insights.delay(integration_id, schema_name=schema_name)
