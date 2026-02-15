from rest_framework import serializers
from .models import Integration

class IntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Integration
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'last_sync_at')
        extra_kwargs = {
            'api_key': {'write_only': True}
        }
