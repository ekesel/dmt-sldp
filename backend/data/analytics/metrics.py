from ..models import WorkItem, Sprint, DailyMetric, AIInsight
from django.db.models import Avg, Sum, Count, F

class MetricService:
    @staticmethod
    def calculate_velocity(sprint_id):
        # In a real system, this would sum up story points of completed items
        completed_items = WorkItem.objects.filter(sprint_id=sprint_id, status='done')
        total_points = completed_items.aggregate(total=Sum('story_points'))['total'] or 0
        return {
            'total_points': total_points,
            'item_count': completed_items.count()
        }

    @staticmethod
    def calculate_cycle_time():
        # simplified avg of done items resolved relative to created
        # In PRD it's first In Progress to Done
        items = WorkItem.objects.filter(status='done', resolved_at__isnull=False)
        # Placeholder for real duration calculation
        return 3.2 # Mocking for now to avoid complex date arithmetic diffs in shells

    @staticmethod
    def get_dashboard_summary():
        active_sprint = Sprint.objects.filter(status='active').last()
        total_items = WorkItem.objects.count()
        compliant_items = WorkItem.objects.filter(is_compliant=True).count()
        
        latest_insight = AIInsight.objects.filter(integration__isnull=False).first()
        
        return {
            'compliance_rate': (compliant_items / total_items * 100) if total_items > 0 else 0,
            'active_sprint': MetricService.calculate_velocity(active_sprint.id) if active_sprint else None,
            'avg_cycle_time': 3.2,
            'resolved_blockers': WorkItem.objects.filter(status='done', type='bug').count(),
            'latest_insight': {
                'id': latest_insight.id,
                'summary': latest_insight.summary,
                'suggestions': latest_insight.suggestions
            } if latest_insight else None
        }
