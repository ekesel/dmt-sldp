from rest_framework import serializers
from .models import WorkItem, SprintMetrics, DeveloperMetrics, AIInsight
from configuration.models import CompanyBaseline

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
            'work_item_title', 'work_item_id',
            # Attribution & violation history
            'assignee_contributions', 'dmt_fields_source',
            'had_violations', 'violation_history', 'violations_cleared_at',
        ]

class AIInsightSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)

    class Meta:
        model = AIInsight
        fields = [
            'id', 'project', 'project_name', 'source_config_id', 
            'summary', 'suggestions', 'forecast', 'created_at'
        ]


class CompanyBaselineSerializer(serializers.ModelSerializer):

    """
    Serializer for CompanyBaseline model
    """
    class Meta:
        model = CompanyBaseline
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'last_updated']

    def to_representation(self, instance):
        
        """
        Custom representation for the CompanyBaseline model
        """
        return {
            "kpis": {
                "velocity": instance.velocity,
                "compliance_rate": instance.compliance_rate,
                "cycle_time": instance.cycle_time,
                "defect_density": instance.defect_density,
                "pr_review_speed": instance.pr_review_speed,
                "ai_usage": instance.ai_usage,
                "item_volume": {
                    "total": instance.item_volume_total,
                    "completed": instance.item_volume_completed
                }
            }
        }

    def to_internal_value(self, data):
        """
        Convert the incoming data to the internal value
        """
        kpis = data.get("kpis", {})
        item_volume = kpis.get("item_volume", {})
        
        internal_data = {}
        
        if "velocity" in kpis:
            internal_data["velocity"] = kpis["velocity"]
        if "compliance_rate" in kpis:
            internal_data["compliance_rate"] = kpis["compliance_rate"]
        if "cycle_time" in kpis:
            internal_data["cycle_time"] = kpis["cycle_time"]
        if "defect_density" in kpis:
            internal_data["defect_density"] = kpis["defect_density"]
        if "pr_review_speed" in kpis:
            internal_data["pr_review_speed"] = kpis["pr_review_speed"]
        if "ai_usage" in kpis:
            internal_data["ai_usage"] = kpis["ai_usage"]
            
        if "total" in item_volume:
            internal_data["item_volume_total"] = item_volume["total"]
        if "completed" in item_volume:
            internal_data["item_volume_completed"] = item_volume["completed"]
            
        return super().to_internal_value(internal_data)

