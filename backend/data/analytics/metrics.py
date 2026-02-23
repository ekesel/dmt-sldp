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
    def calculate_cycle_time(items_qs):
        """
        Calculate average cycle time for a set of items.
        Cycle Time = resolved_at - started_at.
        Fallback to Lead Time = resolved_at - created_at if started_at is missing.
        """
        # Filter only done items with resolved_at
        items = items_qs.filter(status_category='done', resolved_at__isnull=False)
        if not items.exists():
            return 0
            
        durations = []
        for item in items:
            # Prefer started_at, fallback to created_at (Lead Time)
            start = item.started_at or item.created_at
            if start and item.resolved_at:
                delta = item.resolved_at - start
                # Use total_seconds to handle microsecond precision and convert to days
                durations.append(delta.total_seconds() / 86400.0)
        
        if not durations:
            return 0
            
        return round(sum(durations) / len(durations), 1)

    @staticmethod
    def populate_sprint_metrics(sprint_id):
        """
        Calculate and persist metrics for a specific sprint, both globally and per project.
        """
        from ..models import SprintMetrics, WorkItem, Sprint
        from configuration.models import Project, SourceConfiguration
        from django.db.models import Sum, Count, Q
        
        sprint = Sprint.objects.get(id=sprint_id)
        if not sprint.start_date or not sprint.end_date:
            return None
            
        projects = list(Project.objects.all()) + [None] # All projects + Global (None)
        
        results = []
        for project in projects:
            # 1. Base query for this sprint
            work_items = WorkItem.objects.filter(sprint=sprint)
            if project:
                source_conf_ids = SourceConfiguration.objects.filter(project=project).values_list('id', flat=True)
                work_items = work_items.filter(source_config_id__in=source_conf_ids)
            
            if not work_items.exists() and project is not None:
                continue # Skip projects with no items in this sprint

            completed_items = work_items.filter(status_category='done')
            
            # 2. Velocity & Points
            points_stats = completed_items.aggregate(total_points=Sum('story_points'))
            velocity = points_stats['total_points'] or 0
            
            # 3. Throughput
            throughput_stats = completed_items.aggregate(
                total_count=Count('id'),
                stories=Count('id', filter=Q(item_type='story')),
                bugs=Count('id', filter=Q(item_type='bug'))
            )
            # 4. Compliance (Only for parent tasks)
            # Use parent_id field added during schema migration
            parent_work_items = work_items.filter(parent_id__isnull=True)
            total_count = parent_work_items.count()
            compliant_count = parent_work_items.filter(dmt_compliant=True).count()
            compliance_rate = (compliant_count / total_count * 100) if total_count > 0 else 0
            
            # 5. Quality
            defects = work_items.filter(item_type='bug').count()
            
            # 6. Cycle Time
            avg_cycle_time = MetricService.calculate_cycle_time(work_items)

            metrics_obj, created = SprintMetrics.objects.update_or_create(
                sprint_name=sprint.name,
                sprint_end_date=sprint.end_date.date(),
                project=project,
                defaults={
                    'sprint_start_date': sprint.start_date.date(),
                    'total_story_points_completed': velocity,
                    'velocity': velocity,
                    'items_completed': throughput_stats['total_count'] or 0,
                    'stories_completed': throughput_stats['stories'] or 0,
                    'bugs_completed': throughput_stats['bugs'] or 0,
                    'total_items': total_count,
                    'compliant_items': compliant_count,
                    'compliance_rate_percent': round(compliance_rate, 2),
                    'defects_found_post_release': defects,
                    'avg_cycle_time_days': avg_cycle_time,
                }
            )
            results.append(metrics_obj)
            
        return results

    @staticmethod
    def get_dashboard_summary(project_id=None): # Modified to accept project_id
        from ..models import SprintMetrics, AIInsight
        from django.db import connection
        from tenants.models import AuditLog
        from configuration.models import SourceConfiguration
        
        if connection.schema_name == 'public':
            return {
                'compliance_rate': 0,
                'active_sprint': None,
                'avg_cycle_time': 0,
                'bugs_resolved': 0,
                'latest_insight': None,
                'api_requests_count': AuditLog.objects.count()
            }

        sprints_qs = SprintMetrics.objects.order_by('-sprint_end_date')
        
        if project_id:
            sprints_qs = sprints_qs.filter(project_id=project_id)
        else:
            sprints_qs = sprints_qs.filter(project__isnull=True)
            
        # Get last 5 sprints for averaging
        last_5_metrics = list(sprints_qs[:5])
        
        latest_insight = AIInsight.objects.filter(source_config_id__isnull=False).first()
        
        if last_5_metrics:
            # Calculate averages across the last 5 (or fewer if not available)
            total_velocity = sum(m.velocity for m in last_5_metrics)
            total_items = sum(m.items_completed for m in last_5_metrics)
            total_cycle_time = sum(m.avg_cycle_time_days for m in last_5_metrics)
            total_bugs = sum(m.bugs_completed for m in last_5_metrics)
            count = len(last_5_metrics)
            
            avg_velocity = total_velocity / count
            avg_items = total_items / count
            avg_cycle_time = total_cycle_time / count
            
            # Use the latest sprint's compliance and insights for the summary
            latest = last_5_metrics[0]
            
            return {
                'compliance_rate': round(latest.compliance_rate_percent, 2),
                'active_sprint': {
                    'total_points': round(avg_velocity, 1),
                    'item_count': round(avg_items, 1)
                },
                'avg_cycle_time': round(avg_cycle_time, 1),
                'bugs_resolved': total_bugs,
                'latest_insight': {
                    'id': latest_insight.id,
                    'summary': latest_insight.summary,
                    'suggestions': latest_insight.suggestions
                } if latest_insight else None,
                'api_requests_count': AuditLog.objects.count()
            }
        
        # Fallback to dynamic if no SprintMetrics
        sprints = Sprint.objects.exclude(status='backlog').order_by('-end_date')[:5]
        total_items_qs = WorkItem.objects.all()
        if project_id:
            source_config_ids = SourceConfiguration.objects.filter(project_id=project_id).values_list('id', flat=True)
            total_items_qs = total_items_qs.filter(source_config_id__in=source_config_ids)
            
        total_count = total_items_qs.count()
        compliant_count = total_items_qs.filter(dmt_compliant=True).count()
        
        # Calculate dynamic average velocity if metrics missing
        dynamic_velocities = []
        total_bugs_dynamic = 0
        for s in sprints:
            v = MetricService.calculate_velocity(s.id)
            dynamic_velocities.append(v)
            # Add bugs completed in this sprint
            sprint_items = total_items_qs.filter(sprint=s)
            total_bugs_dynamic += sprint_items.filter(status_category='done', item_type='bug').count()
        
        if dynamic_velocities:
            avg_points = sum(v['total_points'] for v in dynamic_velocities) / len(dynamic_velocities)
            avg_count = sum(v['item_count'] for v in dynamic_velocities) / len(dynamic_velocities)
            avg_cycle_time = MetricService.calculate_cycle_time(total_items_qs) # Global avg
        else:
            avg_points = 0
            avg_count = 0
            avg_cycle_time = 0
        
        return {
            'compliance_rate': (compliant_count / total_count * 100) if total_count > 0 else 0,
            'active_sprint': {
                'total_points': round(avg_points, 1),
                'item_count': round(avg_count, 1)
            },
            'avg_cycle_time': avg_cycle_time,
            'bugs_resolved': total_bugs_dynamic,
            'latest_insight': {
                'id': latest_insight.id,
                'summary': latest_insight.summary,
                'suggestions': latest_insight.suggestions
            } if latest_insight else None,
            'api_requests_count': AuditLog.objects.count()
        }
