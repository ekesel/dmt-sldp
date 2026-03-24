import logging
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
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

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
        
        # 3. Trigger PR Analysis if Source is Git-based
        if source.source_type in ['github', 'azure_devops_git']:
            analyze_pr_ai_usage.delay(source.id, schema_name=schema_name or connection.schema_name)
            
        # 4. Trigger Metric Recalculation (Async)
        update_all_sprint_metrics.delay(schema_name=schema_name or connection.schema_name)
        
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
        MetricService.populate_developer_metrics(sprint.id)
        if metrics:
            count += 1
            
    # Signal dashboard that metrics have been updated
    from tenants.models import Tenant
    try:
        tenant = Tenant.objects.get(schema_name=connection.schema_name)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"telemetry_{tenant.slug}",
            {
                "type": "telemetry_update",
                "message": {
                    "type": "metrics_update"
                }
            }
        )
    except Exception as e:
        print(f"Failed to broadcast metrics update: {e}")

    return f"Updated metrics for {count} sprints in {connection.schema_name}"

@shared_task
@tenant_aware_task
def analyze_pr_ai_usage(source_id, schema_name=None):
    """
    Analyzes pull requests to compute AI usage percent from diffs.
    Also syncs Reviewers and Commits via the Git Connector.
    """
    start_time = timezone.now()
    log = TaskLog.objects.create(
        task_name="analyze_pr_ai_usage",
        target_id=str(source_id),
        status='running'
    )
    
    try:
        source = SourceConfiguration.objects.get(id=source_id)
        
        full_config = {
            **(source.config_json or {}),
            'base_url': source.base_url,
            'api_key': source.api_key,
            'username': source.username,
        }
        
        # 1. Sync PRs, Diff, Reviews, and Commits via connector
        # This connector call internally updates PullRequest.ai_code_percent
        # as well as PullRequestReviewer and Commit models.
        connector = ConnectorFactory.get_connector(source.source_type, full_config)
        
        def progress_cb(percent, msg):
            log.error_message = f"{percent}%: {msg}"
            log.save(update_fields=['error_message'])
            
        if connector:
            connector.sync(source.project.tenant.id, source.id, progress_callback=progress_cb)
            
        # 2. Rollup: WorkItem.code_ai_usage_percent 
        # (Weighted average based on pr_links mapped to WorkItems)
        project_source_ids = list(SourceConfiguration.objects.filter(project_id=source.project.id).values_list('id', flat=True))
        items = WorkItem.objects.filter(source_config_id__in=project_source_ids)
        rollup_count = 0
        prs_matched = 0
        
        for item in items:
            matched_prs = []
            
            # Explicit PR Links
            if item.pr_links:
                for link in item.pr_links:
                    parts = link.strip('/').split('/')
                    if parts and parts[-1].isdigit():
                        pr_id = parts[-1]
                        matches = PullRequest.objects.filter(
                            source_config_id__in=project_source_ids,
                            external_id=pr_id
                        )
                        for m in matches:
                            if m not in matched_prs:
                                matched_prs.append(m)
                                
            # Fallback
            if not matched_prs:
                matches = PullRequest.objects.filter(
                    source_config_id__in=project_source_ids,
                    pr_url__icontains=item.external_id
                )
                for m in matches:
                    if m not in matched_prs:
                        matched_prs.append(m)
            
            if matched_prs:
                total_ai_lines = 0
                total_changed_lines = 0
                
                for pr in matched_prs:
                    if pr.ai_generated_lines is not None and pr.total_changed_lines is not None:
                        total_ai_lines += pr.ai_generated_lines
                        total_changed_lines += pr.total_changed_lines
                
                if total_changed_lines > 0:
                    percent = (total_ai_lines / total_changed_lines) * 100.0
                    item.code_ai_usage_percent = round(percent, 2)
                    item.save(update_fields=['code_ai_usage_percent'])
                    rollup_count += 1
                
                prs_matched += len(matched_prs)
                    
        log.status = 'success'
        if source.source_type in ['azure_devops_git', 'azure_devops', 'azure_boards']:
            log.error_message = f"Analyzed PRs. Matched {prs_matched} PRs. Native ADO AI Usage metrics preserved."
        else:
            log.error_message = f"Analyzed PRs. Matched {prs_matched} PRs to Work Items. Rolled up metrics for {rollup_count} work items."

        # 3. Trigger metrics update to surface these bounds to DeveloperMetrics
        update_all_sprint_metrics.delay(schema_name=schema_name or connection.schema_name)
        
        return log.error_message
        
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
@tenant_aware_task
def backfill_identity_merge(mapping_id, schema_name=None):
    """
    Retroactively updates all historical records to use the canonical email
    defined in a UserIdentityMapping.
    """
    from .models import UserIdentityMapping, WorkItem, PullRequest, PullRequestReviewer, Commit, DeveloperMetrics
    from django.db import connection
    
    try:
        mapping = UserIdentityMapping.objects.get(id=mapping_id)
    except UserIdentityMapping.DoesNotExist:
        return f"Mapping {mapping_id} not found."

    canonical_email = mapping.canonical_email
    aliases = [ident.get('email') for ident in mapping.source_identities if ident.get('email')]
    # Include canonical email in the update set to ensure consistency
    all_emails = list(set([canonical_email] + aliases))
    
    logger.info(f"Backfilling identity merge for {canonical_email}. Aliases: {aliases}")

    # 1. Update WorkItems
    WorkItem.objects.filter(assignee_email__in=all_emails).update(
        assignee_email=canonical_email,
        assignee_name=mapping.canonical_name
    )
    WorkItem.objects.filter(creator_email__in=all_emails).update(creator_email=canonical_email)
    
    # 2. Update PullRequests
    PullRequest.objects.filter(author_email__in=all_emails).update(
        author_email=canonical_email,
        author_name=mapping.canonical_name
    )
    
    # 3. Update PR Reviewers
    PullRequestReviewer.objects.filter(reviewer_email__in=all_emails).update(
        reviewer_email=canonical_email,
        reviewer_name=mapping.canonical_name
    )
    
    # 4. Update Commits
    Commit.objects.filter(author_email__in=all_emails).update(
        author_email=canonical_email,
        author_name=mapping.canonical_name
    )
    
    # 5. Delete stale DeveloperMetrics for aliases (excluding canonical to keep history)
    DeveloperMetrics.objects.filter(developer_email__in=aliases).exclude(developer_email=canonical_email).delete()
    
    # 6. Re-calculate DeveloperMetrics
    # Trigger a full refresh of all sprints for this tenant
    update_all_sprint_metrics.delay(schema_name=schema_name or connection.schema_name)
    
    return f"Successfully backfilled identity merge for {canonical_email}."
