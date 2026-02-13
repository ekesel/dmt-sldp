from celery import shared_task
from django.utils import timezone
from django.db import connection
from .models import Integration, WorkItem, Sprint, TaskLog
from .connectors.factory import ConnectorFactory
from .signals import data_sync_completed

@shared_task
def sync_tenant_data(integration_id):
    """Sync data for a specific integration."""
    start_time = timezone.now()
    log = TaskLog.objects.create(
        task_name="sync_tenant_data",
        target_id=str(integration_id),
        status='running'
    )
    
    try:
        integration = Integration.objects.get(id=integration_id, is_active=True)
    except Integration.DoesNotExist:
        log.status = 'failed'
        log.error_message = f"Integration {integration_id} not found or inactive."
        log.save()
        return log.error_message

    try:
        connector = ConnectorFactory.get_connector(integration)
        
        # Proactively refresh token if needed (e.g., for Jira OAuth2)
        if hasattr(connector, 'refresh_access_token'):
            connector.refresh_access_token()
        
        # 1. Sync Sprints
        sprints_data = connector.fetch_sprints()
        for s_data in sprints_data:
            Sprint.objects.update_or_create(
                external_id=s_data['external_id'],
                defaults={
                    'name': s_data['name'],
                    'status': s_data['status'],
                }
            )

        # 2. Sync Work Items
        from .engine.compliance import ComplianceEngine
        engine = ComplianceEngine()
        
        work_items_data = connector.fetch_work_items(last_sync=integration.last_sync_at)
        for wi_data in work_items_data:
            # Simple mapping for demonstration
            item, created = WorkItem.objects.update_or_create(
                external_id=wi_data['external_id'],
                defaults={
                    'integration': integration,
                    'title': wi_data['title'],
                    'type': wi_data['type'],
                    'status': wi_data['status'],
                    'created_at': wi_data['created_at'],
                    'updated_at': wi_data['updated_at'],
                }
            )
            # Trigger compliance check
            engine.check_compliance(item)

        # 3. Sync Pull Requests (Git Sources)
        import re
        from .models import PullRequest, PullRequestStatus
        
        # ID patterns: [JIRA-123], JIRA-123, #123 (mapped to external_id)
        ID_PATTERN = re.compile(r'([A-Z]+-\d+|#\d+)', re.IGNORECASE)
        
        prs_data = connector.fetch_pull_requests()
        for pr_data in prs_data:
            # Find matching WorkItem
            work_item = None
            match = ID_PATTERN.search(pr_data['title']) or ID_PATTERN.search(pr_data['source_branch'])
            if match:
                item_id = match.group(1).replace('#', '').upper()
                work_item = WorkItem.objects.filter(external_id__icontains=item_id).first()

            pr, created = PullRequest.objects.update_or_create(
                external_id=pr_data['external_id'],
                defaults={
                    'integration': integration,
                    'work_item': work_item,
                    'title': pr_data['title'],
                    'author_email': pr_data['author_email'],
                    'status': pr_data['status'],
                    'repository_name': pr_data['repository_name'],
                    'source_branch': pr_data['source_branch'],
                    'target_branch': pr_data['target_branch'],
                    'created_at': pr_data['created_at'],
                    'updated_at': pr_data['updated_at'],
                    'merged_at': pr_data.get('merged_at'),
                }
            )

            # NEW: Sync Status Checks for active PRs
            if pr.status == 'open' and hasattr(connector, 'fetch_status_checks'):
                checks = connector.fetch_status_checks(pr.external_id)
                for check in checks:
                    PullRequestStatus.objects.update_or_create(
                        pull_request=pr,
                        name=check['name'],
                        defaults={
                            'state': check['state'],
                            'target_url': check.get('target_url'),
                            'description': check.get('description'),
                        }
                    )
            
            # Recalculate compliance for linked WorkItem if PR status/checks changed
            if work_item:
                engine.check_compliance(work_item)

        # Update last sync timestamp
        integration.last_sync_at = timezone.now()
        integration.save()
        
        # Signal completion
        data_sync_completed.send(
            sender=sync_tenant_data,
            integration_id=integration.id,
            schema_name=connection.schema_name
        )
        
        log.status = 'success'
        return f"Successfully synced {integration.name}"
        
    except Exception as e:
        log.status = 'failed'
        log.error_message = str(e)
        raise e
    finally:
        end_time = timezone.now()
        log.execution_time_ms = int((end_time - start_time).total_seconds() * 1000)
        log.finished_at = end_time
        log.save()

@shared_task
def run_all_integrations_sync():
    """Trigger sync for all active integrations across all tenants."""
    active_integrations = Integration.objects.filter(is_active=True)
    for integration in active_integrations:
        sync_tenant_data.delay(integration.id)
    return f"Triggered sync for {active_integrations.count()} integrations"

@shared_task
def run_retention_cleanup():
    from django.core.management import call_command
    call_command('cleanup_old_data')

@shared_task
def aggregate_tenant_metrics(tenant_id, target_date_str=None):
    """Compute and store metrics for a specific tenant on a given date."""
    from django_tenants.utils import schema_context
    from .models import DailyMetric, WorkItem, PullRequest, Sprint
    from django.db.models import Count, Avg, F
    from datetime import timedelta, datetime
    from tenants.models import Tenant
    
    if target_date_str is None:
        target_date = (timezone.now() - timedelta(days=1)).date()
    else:
        target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()

    tenant = Tenant.objects.get(id=tenant_id)
    
    with schema_context(tenant.schema_name):
        day_start = timezone.make_aware(datetime.combine(target_date, datetime.min.time()))
        day_end = day_start + timedelta(days=1)
        
        # 1. Total & Compliant WorkItems
        total_items = WorkItem.objects.filter(created_at__lt=day_end).count()
        compliant_items = WorkItem.objects.filter(created_at__lt=day_end, is_compliant=True).count()
        compliance_rate = (compliant_items / total_items * 100) if total_items > 0 else 0
        
        # 2. PR Snapshot
        merged_prs = PullRequest.objects.filter(merged_at__range=(day_start, day_end))
        prs_merged_count = merged_prs.count()
        
        # 3. Cycle Time (Avg time to resolve for items resolved today)
        resolved_items = WorkItem.objects.filter(resolved_at__range=(day_start, day_end))
        avg_cycle_time = resolved_items.annotate(
            duration=F('resolved_at') - F('created_at')
        ).aggregate(avg_duration=Avg('duration'))['avg_duration']
        
        avg_cycle_time_hours = avg_cycle_time.total_seconds() / 3600 if avg_cycle_time else 0
        
        DailyMetric.objects.update_or_create(
            date=target_date,
            defaults={
                'total_work_items': total_items,
                'compliant_work_items': compliant_items,
                'compliance_rate': compliance_rate,
                'avg_cycle_time_hours': avg_cycle_time_hours,
                'prs_merged_count': prs_merged_count,
            }
        )
        
        return f"Aggregated metrics for {tenant.schema_name} on {target_date}"

@shared_task
def run_daily_aggregation():
    """Iterate over all tenants and trigger aggregation."""
    from tenants.models import Tenant
    tenants = Tenant.objects.exclude(schema_name='public')
    for tenant in tenants:
        aggregate_tenant_metrics.delay(tenant.id)
    return f"Triggered aggregation for {tenants.count()} tenants"
