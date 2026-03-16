from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Post
from notifications.models import Notification
from users.models import User


@receiver(post_save, sender=Post)
def notify_on_post_creation(sender, instance, created, **kwargs):
    """
    When a new Post is created, notify all users in the same tenant
    (except the author). The Notification model's own post_save signal
    will automatically broadcast each notification over WebSocket.
    """
    if not created:
        return  

    # Get all tenant users except the author
    recipients = User.objects.filter(
        tenant=instance.author.tenant
    ).exclude(id=instance.author.id)

    # Create a Notification for each recipient.
    # This automatically triggers 'broadcast_notification' signal
    # in notifications/models.py → pushes to WebSocket via Channel Layer.
    author_name = instance.author.get_full_name() or instance.author.username
    for user in recipients:
        Notification.objects.create(
            user=user,
            tenant=instance.author.tenant,
            title="New Post Created",
            message=f'"{instance.title}" was just posted by {author_name}.',
            notification_type=Notification.TYPE_INFO,
            data={'post_id': instance.post_id}
        )