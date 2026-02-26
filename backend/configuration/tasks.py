from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from .models import SourceConfiguration
from etl.factory import ConnectorFactory
from django_tenants.utils import schema_context
from data.tasks import update_all_sprint_metrics
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def perform_sync_task(self, source_id: int):
    """
    Orchestrate full sync for a given source.
    Emits WS progress updates.
    """
    channel_layer = get_channel_layer()
    
    tenant_id = None
    group_name = None

    # tenant_id = None # No longer needed directly for group_name
    group_name = None # Will be set after source is fetched

    def emit_progress(progress: int, message: str, status: str = 'in_progress', stats: dict = None):
        """Helper to send WS update"""
        if not group_name:
            logger.warning(f"Attempted to emit progress before group_name was set for source {source_id}")
            return
        try:
            # logger.info(f"Emitting sync progress for source {source_id}: {progress}% - {message}") # Removed as per instruction
            event = {
                "type": "sync_progress",
                "source_id": source_id,
                "project_id": source.project.id, # Added project_id
                "progress": progress,
                "message": message,
                "status": status,
                "stats": stats # Added stats
            }
            async_to_sync(channel_layer.group_send)(
                group_name,
                event
            )
        except Exception as e:
            logger.error(f"Failed to emit WS progress for source {source_id}: {e}")

    try:
        source = SourceConfiguration.objects.get(id=source_id)
        # tenant_id = source.project.tenant.id # No longer used for group_name
        tenant_slug = source.project.tenant.slug # Use tenant slug for group name
        group_name = f"telemetry_{tenant_slug}" # Set group_name here
        
        # 1. Start
        source.last_sync_status = 'in_progress'
        source.save()
        
        emit_progress(5, "Initializing sync...")

        # 2. Get Connector
        config = source.config_json or {}
        config.update({
            'base_url': source.base_url,
            'api_token': source.api_key,
            'username': source.username,
        })
        
        if source.api_token_encrypted:
            # Decrypt if needed
            # config['api_token'] = decrypt(source.api_token_encrypted)
            pass
        
        connector = ConnectorFactory.get_connector(source.source_type, config)
        if not connector:
            raise ValueError(f"No connector found for type: {source.source_type}")

        # 3. Sync
        emit_progress(20, f"Connecting to {source.source_type}...")
        
        # This is where the heavy lifting happens
        with schema_context(source.project.tenant.schema_name):
            stats = connector.sync(tenant_id, source_id, progress_callback=emit_progress)
        
        # 4. Success
        source.last_sync_status = 'success'
        source.last_sync_at = timezone.now()
        source.last_error_message = ""
        source.consecutive_failures = 0
        source.save()
        
        emit_progress(100, f"Sync completed. {stats.get('item_count', 0)} items processed.", status='success')
        
        # Signal dashboard to refresh metrics
        try:
            # First trigger recalculation on backend
            update_all_sprint_metrics.delay(schema_name=source.project.tenant.schema_name)
            
            # Then signal frontend to refetch (with a slight delay or after recap completes)
            # Frontend will refetch immediately, but since update_all_sprint_metrics is async,
            # we might want to also send another signal when recalculation finishes.
            # For now, this is a major improvement.
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "telemetry_update",
                    "message": {
                        "type": "metrics_update",
                        "project_id": source.project.id,
                        "sync_id": source_id
                    }
                }
            )
        except Exception as e:
            logger.error(f"Failed to emit metrics_update after sync: {e}")
        
    except Exception as e:
        logger.exception(f"Sync failed for source {source_id}")
        
        # 5. Failure
        try:
            source = SourceConfiguration.objects.get(id=source_id)
            source.last_sync_status = 'failed'
            source.last_error_message = str(e)
            source.consecutive_failures += 1
            source.save()
        except Exception as db_err:
            logger.error(f"Failed to update source status after sync failure: {db_err}")
            
        emit_progress(0, f"Sync failed: {str(e)}", status='failed')
