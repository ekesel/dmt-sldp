from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsTenantUser(BasePermission):
    """
    Allows access only to authenticated users belonging to the current tenant.
    """
    message = "You do not have permission to access this tenant's data."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        if hasattr(request, 'tenant') and hasattr(request.user, 'tenant'):
            return request.user.tenant_id == request.tenant.id
            
        return True

class IsManager(BasePermission):
    """
    Permission class to allow only managers of the current tenant to perform actions.
    """
    message = "Only managers of this tenant are allowed to perform this action."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # Ensure user is working within their own tenant FIRST
        if hasattr(request, 'tenant') and hasattr(request.user, 'tenant'):
            if request.user.tenant_id != request.tenant.id:
                return False
                
        is_manager = getattr(request.user, 'is_manager', False)
        return bool(is_manager)


class IsManagerOrReadOnly(BasePermission):
    """
    Allows read-only access to authenticated users of the tenant, but only managers of the current tenant can perform write operations.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # Ensure user is working within their own tenant FIRST
        if hasattr(request, 'tenant') and hasattr(request.user, 'tenant'):
            if request.user.tenant_id != request.tenant.id:
                return False
                
        if request.method in SAFE_METHODS:
            return True
            
        is_manager = getattr(request.user, 'is_manager', False)
        return bool(is_manager)