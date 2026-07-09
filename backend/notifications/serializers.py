from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'is_read', 'data', 'created_at']
        read_only_fields = ['id', 'created_at']

class QuickUpdateNotificationSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'user_name', 'title', 'message', 'notification_type', 'is_read', 'data', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_user_name(self, obj):
        sender = obj.sender
        if not sender:
            return ""
        full_name = f"{sender.first_name} {sender.last_name}".strip()
        if full_name:
            return full_name
        if sender.username:
            return sender.username
        if sender.email:
            return sender.email
        return ""
