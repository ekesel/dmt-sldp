from functools import wraps
import inspect
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
        # Use inspect to find schema_name in either args or kwargs
        sig = inspect.signature(f)
        try:
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            schema_name = bound_args.arguments.get('schema_name')
        except TypeError:
            # Fallback if binding fails
            schema_name = kwargs.get('schema_name')

        if not schema_name:
            logger.error(f"Task {f.__name__} called without 'schema_name'. Execution may fail or use 'public' schema.")
            return f(*args, **kwargs)
        
        with schema_context(schema_name):
            logger.info(f"Executing task {f.__name__} in schema: {schema_name}")
            return f(*args, **kwargs)
    return wrapper
