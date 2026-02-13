from functools import wraps
from django_tenants.utils import schema_context
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

def tenant_aware_task(f):
    """
    Decorator to wrap a Celery task in a django-tenants schema context.
    Expects 'schema_name' as a keyword argument.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        schema_name = kwargs.pop('schema_name', None)
        if not schema_name:
            logger.error(f"Task {f.__name__} called without 'schema_name'. Execution may fail or use 'public' schema.")
            # Fallback to public or raise? For now, we'll try to proceed but log the error.
            # In a strict environment, we should probably raise an error.
            return f(*args, **kwargs)
        
        with schema_context(schema_name):
            logger.info(f"Executing task {f.__name__} in schema: {schema_name}")
            return f(*args, **kwargs)
    return wrapper
