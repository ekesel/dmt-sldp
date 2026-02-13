from celery import shared_task
from django.utils import timezone
from django.db import connection
from .models import Integration, WorkItem, Sprint
from .connectors.factory import ConnectorFactory
from .signals import data_sync_completed

@shared_task
def sync_tenant_data(integration_id):
    """Sync data for a specific integration."""
    try:
        integration = Integration.objects.get(id=integration_id, is_active=True)
    except Integration.DoesNotExist:
        return f"Integration {integration_id} not found or inactive."

    connector = ConnectorFactory.get_connector(integration)
    
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
    from .models import PullRequest
    
    # ID patterns: [JIRA-123], JIRA-123, #123 (mapped to external_id)
    ID_PATTERN = re.compile(r'([A-Z]+-\d+|\#\d+)', re.IGNORECASE)
    
    prs_data = connector.fetch_pull_requests()
    for pr_data in prs_data:
        # Find matching WorkItem
        work_item = None
        match = ID_PATTERN.search(pr_data['title']) or ID_PATTERN.search(pr_data['source_branch'])
        if match:
            item_id = match.group(1).replace('#', '').upper()
            work_item = WorkItem.objects.filter(external_id__icontains=item_id).first()

        PullRequest.objects.update_or_create(
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

    # Update last sync timestamp
    integration.last_sync_at = timezone.now()
    integration.save()
    
    # Signal completion
    data_sync_completed.send(
        sender=sync_tenant_data,
        integration_id=integration.id,
        schema_name=connection.schema_name
    )
    
    return f"Successfully synced {integration.name}"

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
