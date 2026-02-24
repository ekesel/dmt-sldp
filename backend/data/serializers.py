from rest_framework import serializers
from .models import WorkItem, SprintMetrics, DeveloperMetrics, AIInsight

class WorkItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkItem
        fields = '__all__'

class SprintMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SprintMetrics
        fields = '__all__'

class DeveloperMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeveloperMetrics
        fields = '__all__'

class DeveloperListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeveloperMetrics
        fields = ['developer_source_id', 'developer_name', 'developer_email', 'sprint_name', 'sprint_end_date']

class ComplianceFlagSerializer(serializers.ModelSerializer):
    work_item_title = serializers.CharField(source='title', read_only=True)
    work_item_id = serializers.CharField(source='external_id', read_only=True)
    
    class Meta:
        model = WorkItem
        fields = [
            'id', 'external_id', 'title', 'status', 'assignee_name', 
            'dmt_compliant', 'compliance_failures', 'updated_at',
            'work_item_title', 'work_item_id'
        ]

class AIInsightSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)

    class Meta:
        model = AIInsight
        fields = [
            'id', 'project', 'project_name', 'source_config_id', 
            'summary', 'suggestions', 'forecast', 'created_at'
        ]
