from celery import shared_task
from .factory import ConnectorFactory
from configuration.models import SourceConfiguration
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@shared_task
def extract_source_data(source_id: int):
    try:
        source = SourceConfiguration.objects.get(id=source_id)
        config = {
            'base_url': source.base_url,
            'api_token': source.api_key, # Use temporary field for now
            'username': source.username,
            'coverage_threshold': source.project.default_coverage_threshold if source.project else 80.0
        }
        
        connector = ConnectorFactory.get_connector(source.source_type, config)
        if not connector:
            logger.error(f"No connector found for type {source.source_type}")
            return

        # Trigger Sync
        logger.info(f"Starting extraction for source {source.name} ({source.source_type})")
        stats = connector.sync(source.project.tenant.id, source.id)
        
        # Update status
        source.last_sync_status = 'success'
        source.last_sync_at = timezone.now()
        source.save()
        
        return stats
        
    except Exception as e:
        logger.error(f"Extraction failed: {str(e)}")
        if source:
            source.last_sync_status = 'failed'
            source.last_error_message = str(e)
            source.save()
