from celery import shared_task
from .factory import ConnectorFactory
from configuration.models import SourceConfiguration
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
        }
        
        connector = ConnectorFactory.get_connector(source.source_type, config)
        if not connector:
            logger.error(f"No connector found for type {source.source_type}")
            return

        # Fetch data (Placeholder)
        logger.info(f"Starting extraction for source {source.name}")
        # data = connector.fetch_work_items()
        
        # Update status
        source.last_sync_status = 'success'
        source.save()
        
    except Exception as e:
        logger.error(f"Extraction failed: {str(e)}")
        if source:
            source.last_sync_status = 'failed'
            source.last_error_message = str(e)
            source.save()
