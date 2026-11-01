from rest_framework import serializers
from .models import WorkItem, SprintMetrics, DeveloperMetrics, AIInsight
from configuration.models import CompanyBaseline
from django.utils import timezone
from .analytics.workload import DEFAULT_SETTINGS, merge_settings, get_workload_settings, settings_timeline, _as_of

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
        timeline = settings_timeline()
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
            },
            # Settings in effect today, plus every saved version (each in effect until the next one).
            "workload_settings": get_workload_settings(timeline=timeline),
            "workload_settings_history": [
                {"effective_from": day, "settings": merge_settings(overrides)}
                for day, overrides in timeline
            ],
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


class WorkloadSettingsVersionSerializer(serializers.Serializer):
    """
    Saves workload settings from effective_from (default today) until the next saved version.
    Partial: given keys merge over the version in effect on that date.
    """
    settings = serializers.JSONField()
    effective_from = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        day = attrs.get('effective_from') or timezone.localdate()
        base = _as_of(settings_timeline(), day) or {}
        attrs['effective_from'] = day
        attrs['settings'] = self._check(attrs['settings'], base)
        return attrs

    def save(self, user):
        from configuration.models import WorkloadSettingsVersion

        WorkloadSettingsVersion.objects.update_or_create(
            effective_from=self.validated_data['effective_from'],
            defaults={'overrides': self.validated_data['settings'], 'created_by': user},
        )

    @staticmethod
    def _check(value, stored):
        """Accept only known keys with sane numeric values; returns them merged over `stored`."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be an object.")
        unknown = set(value) - set(DEFAULT_SETTINGS)
        if unknown:
            raise serializers.ValidationError(f"Unknown keys: {sorted(unknown)}")

        def num(v, name, lo, hi):
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not lo <= v <= hi:
                raise serializers.ValidationError(f"{name} must be a number between {lo} and {hi}.")

        for key in ('sprint_window', 'small_team_min'):
            if key in value:
                num(value[key], key, 1, 50)
                if not isinstance(value[key], int):
                    raise serializers.ValidationError(f"{key} must be a whole number.")
        for key in ('count_subtasks', 'use_percentile', 'use_allocation'):
            if key in value and not isinstance(value[key], bool):
                raise serializers.ValidationError(f"{key} must be true or false.")
        if 'min_allocation' in value:
            num(value['min_allocation'], 'min_allocation', 1, 100)
        for key in ('overload_percentile', 'underutil_percentile'):
            if key in value:
                num(value[key], key, 0, 100)
        for key, allowed in (('per_sprint_limits', ('under', 'over')), ('seniority_weights', ('junior', 'mid', 'senior'))):
            if key in value:
                sub = value[key]
                if not isinstance(sub, dict) or set(sub) - set(allowed):
                    raise serializers.ValidationError(f"{key} keys must be among {list(allowed)}.")
                for k, v in sub.items():
                    num(v, f"{key}.{k}", 0.1 if key == 'seniority_weights' else 0, 100)

        merged = {**(stored or {}), **value}
        for key in ('per_sprint_limits', 'seniority_weights'):
            if key in value:
                merged[key] = {**((stored or {}).get(key) or {}), **value[key]}

        full = merge_settings(merged)
        if full['underutil_percentile'] >= full['overload_percentile']:
            raise serializers.ValidationError("underutil_percentile must be below overload_percentile.")
        if full['per_sprint_limits']['under'] >= full['per_sprint_limits']['over']:
            raise serializers.ValidationError("per_sprint_limits.under must be below over.")
        return merged

