from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'user_name', 'sender_name', 'title', 'message', 'notification_type', 'is_read', 'data', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_user_name(self, obj):
        request = self.context.get('request')
        target_user = None
        if request and obj.sender:
            target_user = obj.user if obj.sender == request.user else obj.sender
        else:
            target_user = obj.sender or obj.user

        if not target_user:
            return ""
        full_name = f"{target_user.first_name} {target_user.last_name}".strip()
        if full_name:
            return full_name
        if target_user.username:
            return target_user.username
        if target_user.email:
            return target_user.email
        return ""

    def get_sender_name(self, obj):
        sender = obj.sender
        if not sender:
            return ""
        full_name = f"{sender.first_name} {sender.last_name}".strip()
        return full_name or sender.username or sender.email or ""

class QuickUpdateNotificationSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    other_user_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'user_name', 'other_user_id', 'title', 'message', 'notification_type', 'is_read', 'data', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_other_user_id(self, obj):
        request = self.context.get('request')
        if not request:
            return obj.sender.id if obj.sender else None
        
        target_user = obj.user if obj.sender == request.user else obj.sender
        return target_user.id if target_user else None

    def get_user_name(self, obj):
        request = self.context.get('request')
        target_user = None
        if request:
            target_user = obj.user if obj.sender == request.user else obj.sender
        else:
            target_user = obj.sender

        if not target_user:
            return ""
        full_name = f"{target_user.first_name} {target_user.last_name}".strip()
        if full_name:
            return full_name
        if target_user.username:
            return target_user.username
        if target_user.email:
            return target_user.email
        return ""

class ChatHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    is_sent_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'user_name', 'title', 'message', 'is_sent_by_me', 'is_read', 'data', 'created_at']
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
        return sender.email or ""

    def get_is_sent_by_me(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return obj.sender == request.user
