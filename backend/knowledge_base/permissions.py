import logging
from rest_framework.permissions import BasePermission, SAFE_METHODS

logger = logging.getLogger(__name__)

class IsTenantUser(BasePermission):
    """
    Allows access only to authenticated users belonging to the current tenant.
    """
    message = "You do not have permission to access this tenant's data."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            logger.error("IsTenantUser: Failed - User not authenticated.")
            self.message = "Authentication credentials were not provided or invalid."
            return False
            
        if hasattr(request, 'tenant') and hasattr(request.user, 'tenant'):
            logger.info(f"IsTenantUser: Checking User tenant_id={request.user.tenant_id} against Request tenant_id={request.tenant.id}")
            
            # Platform admins might not have a tenant, allow them if needed, else strict check
            if str(request.user.tenant_id) != str(request.tenant.id):
                logger.error(f"IsTenantUser: Failed - Tenant mismatch.")
                self.message = "You do not have permission to access this tenant's data."
                return False
            return True
            
        logger.warning("IsTenantUser: Warning - Request or User has no tenant attribute. Allowing by default.")
        return True

class IsManager(BasePermission):
    """
    Permission class to allow only managers of the current tenant to perform actions.
    """
    message = "Only managers of this tenant are allowed to perform this action."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            logger.error("IsManager: Failed - User not authenticated.")
            self.message = "Authentication credentials were not provided or invalid."
            return False
            
        # Ensure user is working within their own tenant FIRST
        if hasattr(request, 'tenant') and hasattr(request.user, 'tenant'):
            logger.info(f"IsManager: Checking User tenant_id={request.user.tenant_id} against Request tenant_id={request.tenant.id}")
            if str(request.user.tenant_id) != str(request.tenant.id):
                logger.error("IsManager: Failed - Tenant mismatch.")
                self.message = "You do not have permission to access this tenant's data."
                return False
                
        is_manager = getattr(request.user, 'is_manager', False)
        is_admin = getattr(request.user, 'is_platform_admin', False)
        is_superuser = getattr(request.user, 'is_superuser', False)
        
        logger.info(f"IsManager: User is_manager={is_manager}, is_admin={is_admin}, is_superuser={is_superuser}")
        
        if not (is_manager or is_admin or is_superuser):
            logger.error("IsManager: Failed - User is not a manager.")
            self.message = "Only managers of this tenant are allowed to perform this action."
            return False
            
        return True


class IsManagerOrReadOnly(BasePermission):
    """
    Allows read-only access to authenticated users of the tenant, but only managers of the current tenant can perform write operations.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            logger.error(f"IsManagerOrReadOnly: Failed - User not authenticated. Path: {request.path}")
            self.message = "Authentication credentials were not provided or invalid."
            return False
            
        # Ensure user is working within their own tenant FIRST
        if hasattr(request, 'tenant') and hasattr(request.user, 'tenant'):
            logger.info(f"IsManagerOrReadOnly: Checking User tenant_id={request.user.tenant_id} against Request tenant_id={request.tenant.id}")
            if str(request.user.tenant_id) != str(request.tenant.id):
                logger.error(f"IsManagerOrReadOnly: Failed - Tenant mismatch. User tenant_id={request.user.tenant_id}, Request tenant_id={request.tenant.id}")
                self.message = "You do not have permission to access this tenant's data."
                return False
                
        if request.method in SAFE_METHODS:
            logger.info(f"IsManagerOrReadOnly: Passed - Safe method {request.method}")
            return True
            
        is_manager = getattr(request.user, 'is_manager', False)
        is_admin = getattr(request.user, 'is_platform_admin', False)
        is_superuser = getattr(request.user, 'is_superuser', False)
        
        logger.info(f"IsManagerOrReadOnly: User is_manager={is_manager}, is_admin={is_admin}, is_superuser={is_superuser}")
        
        if not (is_manager or is_admin or is_superuser):
            logger.error("IsManagerOrReadOnly: Failed - User is not a manager.")
            self.message = "Only managers are allowed to perform this action."
            return False
            
        return True