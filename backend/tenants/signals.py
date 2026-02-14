from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import AuditLog
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@receiver(post_save, sender=AuditLog)
def broadcast_audit_log(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'admin_health',
            {
                'type': 'activity_update',
                'message': {
                    'id': instance.id,
                    'action': instance.action,
                    'entity_type': instance.entity_type,
                    'entity_id': instance.entity_id,
                    'actor_name': instance.user.username if instance.user else 'System',
                    'timestamp': instance.timestamp.isoformat()
                }
            }
        )
