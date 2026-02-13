from celery import shared_task
from django.utils import timezone
from .models import Integration, WorkItem, Sprint
from .connectors.factory import ConnectorFactory

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

    # Update last sync timestamp
    integration.last_sync_at = timezone.now()
    integration.save()
    
    return f"Successfully synced {integration.name}"

@shared_task
def run_all_integrations_sync():
    """Trigger sync for all active integrations across all tenants."""
    active_integrations = Integration.objects.filter(is_active=True)
    for integration in active_integrations:
        sync_tenant_data.delay(integration.id)
    return f"Triggered sync for {active_integrations.count()} integrations"
