from django.db import models
from django.conf import settings

class Notification(models.Model):
    TYPE_INFO = 'info'
    TYPE_SUCCESS = 'success'
    TYPE_WARNING = 'warning'
    TYPE_ERROR = 'error'
    
    # PRD Types
    TYPE_COMPLIANCE_FAILURE = 'compliance_failure'
    TYPE_ETL_FAILURE = 'etl_failure'
    TYPE_SPRINT_ENDING = 'sprint_ending'
    TYPE_EXCEPTION_APPROVED = 'exception_approved'
    TYPE_AI_INSIGHT = 'ai_insight'

    TYPE_CHOICES = [
        (TYPE_INFO, 'Info'),
        (TYPE_SUCCESS, 'Success'),
        (TYPE_WARNING, 'Warning'),
        (TYPE_ERROR, 'Error'),
        (TYPE_COMPLIANCE_FAILURE, 'Compliance Failure'),
        (TYPE_ETL_FAILURE, 'ETL Failure'),
        (TYPE_SPRINT_ENDING, 'Sprint Ending Soon'),
        (TYPE_EXCEPTION_APPROVED, 'DMT Exception Approved'),
        (TYPE_AI_INSIGHT, 'AI Insight'),
    ]

    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255, default='Notification')
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_INFO)
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.notification_type} - {self.message[:20]}..."

from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

@receiver(post_save, sender=Notification)
def broadcast_notification(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        group_name = f'user_{instance.user.id}'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'notification_message',
                'data': {
                    'id': instance.id,
                    'message': instance.message,
                    'notification_type': instance.notification_type,
                    'is_read': instance.is_read,
                    'created_at': instance.created_at.isoformat(),
                }
            }
        )
