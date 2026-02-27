from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Always filter by current user
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'})

    @action(detail=False, methods=['post'], url_path='mark-all-as-read')
    def mark_all_as_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=False, methods=['post'], url_path='send-bulk')
    def send_notification_bulk(self, request):
        """
        Send a notification to multiple users at once.
        POST /api/notifications/send-bulk/
        {
            "recipient_ids": [1, 2, 3],
            "title": "...",
            "message": "...",
            "notification_type": "info"
        }
        """
        from users.models import User

        recipient_ids = request.data.get('recipient_ids', [])
        title = request.data.get('title', 'Manual Notification')
        message = request.data.get('message')
        n_type = request.data.get('notification_type', 'info')

        if not isinstance(recipient_ids, list) or len(recipient_ids) == 0:
            return Response(
                {'error': 'recipient_ids must be a non-empty list'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not message:
            return Response(
                {'error': 'message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tenant = getattr(request.user, 'tenant', None)
        sent_count = 0
        failed = []

        for rid in recipient_ids:
            try:
                recipient = User.objects.get(id=rid)
                if not request.user.is_platform_admin and recipient.tenant != tenant:
                    failed.append({'id': rid, 'reason': 'Not in your tenant'})
                    continue
                Notification.objects.create(
                    user=recipient,
                    tenant=tenant,
                    title=title,
                    message=message,
                    notification_type=n_type
                )
                sent_count += 1
            except User.DoesNotExist:
                failed.append({'id': rid, 'reason': 'User not found'})

        return Response(
            {'sent': sent_count, 'failed': failed},
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], url_path='send')
    def send_notification(self, request):
        """
        Send a notification to a specific user.
        POST /api/notifications/send/
        {
            "recipient_id": 123,
            "title": "...",
            "message": "...",
            "notification_type": "info"
        }
        """
        from users.models import User
        
        recipient_id = request.data.get('recipient_id')
        title = request.data.get('title', 'Manual Notification')
        message = request.data.get('message')
        n_type = request.data.get('notification_type', 'info')
        
        if not recipient_id or not message:
            return Response(
                {'error': 'recipient_id and message are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Only allow sending to users in the same tenant
            # (unless it's a platform admin, but we'll stick to same tenant for now)
            tenant = getattr(request.user, 'tenant', None)
            recipient = User.objects.get(id=recipient_id)
            
            if not request.user.is_platform_admin and recipient.tenant != tenant:
                return Response(
                    {'error': 'Recipient not found in your tenant'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
                
            notification = Notification.objects.create(
                user=recipient,
                tenant=tenant,
                title=title,
                message=message,
                notification_type=n_type
            )
            
            return Response(NotificationSerializer(notification).data, status=status.HTTP_201_CREATED)
            
        except User.DoesNotExist:
            return Response({'error': 'Recipient not found'}, status=status.HTTP_404_NOT_FOUND)
