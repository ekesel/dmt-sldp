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
        if not sprint.end_date:
            # For "In Progress" sprints or items without dates, use today as a default end date
            # to allow metric calculation while the sprint is active.
            from django.utils import timezone
            sprint_end = timezone.now()
        else:
            sprint_end = sprint.end_date
            
        if not sprint.start_date:
            # Fallback for start date if missing
            sprint_start = sprint_end - timezone.timedelta(days=14)
        else:
            sprint_start = sprint.start_date
            
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
            # 4. Compliance (Standardized to ALL work items for dashboard consistency)
            total_count = work_items.count()
            compliant_count = work_items.filter(dmt_compliant=True).count()
            compliance_rate = (compliant_count / total_count * 100) if total_count > 0 else 0
            
            # 5. Quality
            defects = work_items.filter(item_type='bug').count()
            
            # 6. Cycle Time
            avg_cycle_time = MetricService.calculate_cycle_time(work_items)

            metrics_obj, created = SprintMetrics.objects.update_or_create(
                sprint_name=sprint.name,
                sprint_end_date=sprint_end.date(),
                project=project,
                defaults={
                    'sprint_start_date': sprint_start.date(),
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
            total_velocity = sum(m.velocity or 0 for m in last_5_metrics)
            total_items = sum(m.items_completed or 0 for m in last_5_metrics)
            total_cycle_time = sum(m.avg_cycle_time_days or 0 for m in last_5_metrics)
            total_bugs = sum(m.bugs_completed or 0 for m in last_5_metrics)
            count = len(last_5_metrics)
            
            avg_velocity = total_velocity / count
            avg_items = total_items / count
            avg_cycle_time = total_cycle_time / count
            
            # Use the latest sprint's compliance and insights for the summary
            latest = last_5_metrics[0]
            
            return {
                'compliance_rate': round(latest.compliance_rate_percent, 2),
                'velocity': round(avg_velocity, 1) if avg_velocity is not None else 0,
                'active_sprint': {
                    'total_points': round(avg_velocity, 1) if avg_velocity is not None else 0,
                    'item_count': round(avg_items, 1) if avg_items is not None else 0
                },
                'avg_cycle_time': round(avg_cycle_time, 1) if avg_cycle_time is not None else 0,
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
    @staticmethod
    def populate_developer_metrics(sprint_id):
        """
        Calculate and persist metrics for each developer in a specific sprint.
        Accounts for developers working across multiple projects.
        """
        from ..models import DeveloperMetrics, WorkItem, Sprint, PullRequest
        from configuration.models import Project, SourceConfiguration
        from django.db.models import Sum, Count, Q, Avg
        
        sprint = Sprint.objects.get(id=sprint_id)
        if not sprint.end_date:
            from django.utils import timezone
            sprint_end = timezone.now()
        else:
            sprint_end = sprint.end_date
            
        if not sprint.start_date:
            sprint_start = sprint_end - timezone.timedelta(days=14)
        else:
            sprint_start = sprint.start_date
            
        # Get all projects
        projects = list(Project.objects.all())
        
        results = []
        for project in projects:
            source_conf_ids = SourceConfiguration.objects.filter(project=project).values_list('id', flat=True)
            
            # 1. Get all developers who have work items or PRs in this project/sprint
            # We group by email to handle the 'person' across different source IDs if they vary
            dev_emails = WorkItem.objects.filter(
                sprint=sprint, 
                source_config_id__in=source_conf_ids
            ).values_list('assignee_email', flat=True).distinct()
            
            dev_emails = [e for e in dev_emails if e]
            
            for email in dev_emails:
                # Filter work items for this developer in this project/sprint
                dev_work_items = WorkItem.objects.filter(
                    sprint=sprint,
                    assignee_email=email,
                    source_config_id__in=source_conf_ids
                )
                
                # Filter PRs for this developer in this sprint (approximate by date if not linked)
                # In a mature system, PRs are linked to WorkItems or have a sprint field
                from django.db.models import Q
                pr_filter = Q(
                    author_email=email,
                    source_config_id__in=source_conf_ids,
                    created_at__lte=sprint_end
                )
                if sprint_start:
                    pr_filter &= Q(created_at__gte=sprint_start)
                
                dev_prs = PullRequest.objects.filter(pr_filter)
                
                # Calculate stats
                completed_items = dev_work_items.filter(status_category='done')
                points = completed_items.aggregate(total=Sum('story_points'))['total'] or 0
                items_count = completed_items.count()
                
                # DMT Compliance (Standardized to ALL work items)
                total_compliance_target = dev_work_items.count()
                compliant_count = dev_work_items.filter(dmt_compliant=True).count()
                compliance_rate = (compliant_count / total_compliance_target * 100) if total_compliance_target > 0 else 0
                
                # Quality
                defects = dev_work_items.filter(item_type='bug').count()
                avg_coverage = dev_work_items.aggregate(avg=Avg('coverage_percent'))['avg']
                avg_ai_usage = dev_work_items.aggregate(avg=Avg('ai_usage_percent'))['avg'] or 0
                
                # Code Activity
                prs_authored = dev_prs.count()
                prs_merged = dev_prs.filter(merged_at__isnull=False).count()
                
                # Name (Use the most recent name found)
                dev_name = dev_work_items.order_by('-updated_at').values_list('assignee_name', flat=True).first() or email

                metric_obj, created = DeveloperMetrics.objects.update_or_create(
                    developer_email=email,
                    sprint_name=sprint.name,
                    sprint_end_date=sprint_end.date(),
                    project=project,
                    defaults={
                        'developer_source_id': email, # Fallback to email as unique source ID
                        'developer_name': dev_name,
                        'story_points_completed': points,
                        'items_completed': items_count,
                        'prs_authored': prs_authored,
                        'prs_merged': prs_merged,
                        'defects_attributed': defects,
                        'coverage_avg_percent': avg_coverage,
                        'ai_usage_percent': avg_ai_usage,
                        'dmt_compliance_rate': round(compliance_rate, 2),
                    }
                )
                results.append(metric_obj)
        
        # --- Automated Title Logic (Post-Calculation) ---
        self._update_competitive_titles(sprint_id)
                
        return results

    @classmethod
    def _update_competitive_titles(cls, sprint_id):
        """
        Identify top performers across the tenant for this sprint and update User titles.
        """
        from django.contrib.auth import get_user_model
        from ..models import DeveloperMetrics, Sprint
        from django.db.models import Sum, Avg
        
        User = get_user_model()
        
        # 1. Clear ALL existing competitive titles for this tenant first
        # (This avoids multiple ghosts holding a title from previous syncs)
        User.objects.filter(tenant__isnull=False).update(
            competitive_title=None, 
            competitive_title_reason=None
        )

        try:
            sprint = Sprint.objects.get(id=sprint_id)
        except Sprint.DoesNotExist:
            return

        # Aggregate across all projects for this sprint per developer
        top_devs = DeveloperMetrics.objects.filter(
            sprint_name=sprint.name,
            sprint_end_date=sprint.end_date.date() if sprint.end_date else None
        ).values('developer_email', 'developer_name').annotate(
            total_points=Sum('story_points_completed'),
            avg_compliance=Avg('dmt_compliance_rate'),
            total_reviews=Sum('prs_reviewed'),
            avg_ai=Avg('ai_usage_percent')
        )

        if not top_devs.exists():
            return

        # Find category winners
        winners = {
            'Velocity King': max(top_devs, key=lambda x: x['total_points'] or 0),
            'Quality Champion': max(top_devs, key=lambda x: x['avg_compliance'] or 0),
            'Top Reviewer': max(top_devs, key=lambda x: x['total_reviews'] or 0),
            'AI Specialist': max(top_devs, key=lambda x: x['avg_ai'] or 0)
        }

        # Update User objects
        for title, stats in winners.items():
            email = stats['developer_email']
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                continue

            reason = ""
            if title == 'Velocity King':
                reason = f"Velocity King with {round(stats['total_points'], 1)} story points completed this period."
            elif title == 'Quality Champion':
                reason = f"Quality Champion with {round(stats['avg_compliance'], 1)}% DMT compliance rate."
            elif title == 'Top Reviewer':
                reason = f"Top Reviewer with {stats['total_reviews']} pull requests reviewed."
            elif title == 'AI Specialist':
                reason = f"AI Specialist with {round(stats['avg_ai'], 1)}% AI usage in code."

            user.competitive_title = title
            user.competitive_title_reason = reason
            user.save(update_fields=['competitive_title', 'competitive_title_reason'])
