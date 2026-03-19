from celery import shared_task
from django_tenants.utils import schema_context
from tenants.models import Tenant
from newsapp.models import Image
import logging

logger = logging.getLogger(__name__)

@shared_task
def run_nightly_unused_images_cleanup():
    """
    Deletes all Image objects with is_used=False across all active tenants.
    Runs every night at midnight.
    """
    tenants = Tenant.objects.exclude(schema_name='public').filter(status='active')
    total_deleted = 0
    
    for tenant in tenants:
        with schema_context(tenant.schema_name):
            unused_images = Image.objects.filter(is_used=False)
            for image in unused_images:
                try:
                    if image.file:
                        image.file.delete(save=False)
                    image.delete()
                    total_deleted += 1
                except Exception as e:
                    logger.error(f"Error in {tenant.schema_name}: {e}")
                    
    return f"Deleted {total_deleted} unused images across {tenants.count()} tenants."
