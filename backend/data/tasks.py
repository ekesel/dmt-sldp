from celery import shared_task
from django.utils import timezone
from django.db import connection
from .models import Sprint, WorkItem, PullRequest, PullRequestStatus, TaskLog
from configuration.models import SourceConfiguration
from users.services import IdentityService
from etl.factory import ConnectorFactory
from .signals import data_sync_completed
from core.telemetry.models import DataSyncPayload
from core.celery_utils import tenant_aware_task

@shared_task
@tenant_aware_task
def sync_tenant_data(source_id, schema_name=None):
    """Sync data for a specific source configuration."""
    start_time = timezone.now()
    log = TaskLog.objects.create(
        task_name="sync_tenant_data",
        target_id=str(source_id),
        status='running'
    )
    
    try:
        source = SourceConfiguration.objects.get(id=source_id, is_active=True)
    except SourceConfiguration.DoesNotExist:
        log.status = 'failed'
        log.error_message = f"Source {source_id} not found or inactive."
        log.save()
        return log.error_message

    try:
        # Prepare full config for connector
        full_config = {
            **(source.config_json or {}),
            'base_url': source.base_url,
            'api_key': source.api_key,
            'username': source.username,
        }
        # Use common factory
        connector = ConnectorFactory.get_connector(source.source_type, full_config)
        
        # 1. Sync Everything (Sprints, WorkItems, PRs)
        # The connector's sync method handles internal normalization and persistence.
        stats = connector.sync(source.project.tenant.id, source.id)
        
        # 2. Update last sync timestamp
        source.last_sync_at = timezone.now()
        source.last_sync_status = 'success'
        source.save()
        
        # Signal completion with typed payload
        data_sync_completed.send(
            sender=sync_tenant_data,
            payload=DataSyncPayload(
                integration_id=source.id,
                schema_name=connection.schema_name,
                status='success'
            )
        )
        
        log.status = 'success'
        
        # 3. Trigger Metric Recalculation (Async)
        update_all_sprint_metrics.delay(schema_name or connection.schema_name)
        
        return f"Successfully synced {source.name}. Processed {stats.get('item_count', 0)} items."
        
    except Exception as e:
        # Signal failure with typed payload
        data_sync_completed.send(
            sender=sync_tenant_data,
            payload=DataSyncPayload(
                integration_id=source.id,
                schema_name=connection.schema_name if connection.schema_name else 'unknown',
                status='failed'
            )
        )
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
    """Trigger sync for all active sources across all tenants."""
    from configuration.models import SourceConfiguration
    
    # Fetch all active sources with their tenants
    active_sources = SourceConfiguration.objects.filter(is_active=True).select_related('project__tenant')
    total_triggered = 0
    
    for source in active_sources:
        tenant_schema = source.project.tenant.schema_name
        if tenant_schema == 'public':
            continue 
            
        sync_tenant_data.delay(source.id, schema_name=tenant_schema)
        total_triggered += 1
                
    return f"Triggered sync for {total_triggered} sources"

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
        compliant_items = WorkItem.objects.filter(created_at__lt=day_end, dmt_compliant=True).count()
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
                'compliant_work_items': compliant_items, # keeping field name in DailyMetric model for now if it exists there
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

@shared_task
@tenant_aware_task
def update_all_sprint_metrics(schema_name=None):
    """
    Recalculate metrics for all sprints in the current tenant.
    Used after sync or for backfilling.
    """
    from .models import Sprint
    from .analytics.metrics import MetricService
    
    sprints = Sprint.objects.all()
    count = 0
    for sprint in sprints:
        metrics = MetricService.populate_sprint_metrics(sprint.id)
        if metrics:
            count += 1
            
    return f"Updated metrics for {count} sprints in {connection.schema_name}"
