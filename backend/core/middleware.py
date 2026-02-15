import urllib.parse
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import AccessToken

@database_sync_to_async
def get_user_from_token(token_string):
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import AnonymousUser
    User = get_user_model()
    try:
        # Validate the token
        access_token = AccessToken(token_string)
        user_id = access_token.payload['user_id']
        user = User.objects.get(id=user_id)
        return user
    except Exception as e:
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that takes a token from the query string and authenticates the user.
    """
    async def __call__(self, scope, receive, send):
        from django.contrib.auth.models import AnonymousUser
        # 1. Get query string from scope
        query_string = scope.get('query_string', b'').decode()
        query_params = urllib.parse.parse_qs(query_string)
        
        # 2. Extract token from query params
        token = query_params.get('token', [None])[0]
        
        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

class TenantHeaderMiddleware(BaseMiddleware):
    """
    Middleware to handle tenant context switching based on X-Tenant header.
    Expects header 'X-Tenant: <tenant_id>'
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django_tenants.utils import schema_context
        from tenants.models import Tenant

        tenant_id = request.headers.get('X-Tenant')
        
        if tenant_id:
            try:
                # We need to find the tenant to get its schema_name
                # This assumes Tenant model has 'schema_name' or we can derive it
                # For django-tenants, the model itself holds the schema info
                tenant = Tenant.objects.get(id=tenant_id)
                with schema_context(tenant.schema_name):
                    return self.get_response(request)
            except Tenant.DoesNotExist:
                # If tenant doesn't exist, we just proceed with public schema (or default)
                # potentially logging a warning
                pass
            except Exception as e:
                print(f"Error switching tenant context: {e}")

        return self.get_response(request)
