from rest_framework import serializers
from .models import Project, SourceConfiguration

class SourceConfigurationSerializer(serializers.ModelSerializer):
    tenant_id = serializers.ReadOnlyField(source='project.tenant_id')
    
    class Meta:
        model = SourceConfiguration
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'last_sync_at', 'last_sync_status', 'last_error_message', 'consecutive_failures', 'tenant_id')
        extra_kwargs = {
            'api_token_encrypted': {'write_only': True},
            'api_key': {'write_only': True}
        }

class ProjectSerializer(serializers.ModelSerializer):
    # Nested sources for convenient fetching (optional, or use separate endpoint)
    # sources = SourceConfigurationSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ('created_at',)
