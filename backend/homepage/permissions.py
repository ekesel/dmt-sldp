from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsManagerOrReadOnly(BasePermission):
    """
    - Anyone logged in can VIEW (GET, HEAD, OPTIONS)
    - Only managers/admins can CREATE/UPDATE/DELETE
    """

    message = "You are not allowed to perform this action."

    def has_permission(self, request, view):

        # Step 1: Check if user is logged in
        if not request.user or not request.user.is_authenticated:
            self.message = "Please log in first."
            return False

        # Step 2: Check if user belongs to same organization (tenant)
        if not hasattr(request, 'tenant'):
            self.message = "Tenant header is missing or invalid."
            return False

        if hasattr(request.user, 'tenant') and request.user.tenant_id != request.tenant.id:
            self.message = "You do not belong to this organization."
            return False

        # Step 3: Allow read-only requests (GET, HEAD, OPTIONS)
        if request.method in SAFE_METHODS:
            return True

        # Step 4: Allow only managers/admins for write actions
        if (
            getattr(request.user, 'is_manager', False) or
            getattr(request.user, 'is_platform_admin', False) or
            getattr(request.user, 'is_superuser', False)
        ):
            return True

        # Step 5: If none of the above, deny access
        self.message = "Only managers or admins can modify data."
        return False


class HasRequiredPermission(BasePermission):
    """
    Checks if the user has a specific permission code defined on the view class as 'required_permission_code'.
    Authorized users: managers, platform admins, superusers, or roles with the specified permission_code.
    """
    message = "This action cannot be performed by your current role."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            self.message = "Please log in first."
            return False

        if not hasattr(request, 'tenant'):
            self.message = "Tenant header is missing or invalid."
            return False

        if hasattr(request.user, 'tenant') and request.user.tenant_id != request.tenant.id:
            self.message = "You do not belong to this organization."
            return False

        if request.method in SAFE_METHODS:
            return True

        # Check if the view specifies a required permission code
        perm_code = getattr(view, 'required_permission_code', None)
        if not perm_code:
            self.message = "No permission code configured for this view."
            return False
        
        #  Allow only super adminadmins for write actions
        if (
            getattr(request.user, 'is_platform_admin', False) or
            getattr(request.user, 'is_superuser', False)
        ):
            return True
    

        user_role = getattr(request.user, 'role', None)
        if user_role:
            has_perm = user_role.permissions.filter(permission_code=perm_code).exists()
            if has_perm:
                return True

        self.message = "This action cannot be performed by your current role."
        return False

class IsUser(BasePermission):
    message = "You are not authorized to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            self.message = "Please log in first."
            return False

        if not hasattr(request, 'tenant'):
            self.message = "Tenant header is missing or invalid."
            return False

        if hasattr(request.user, 'tenant') and request.user.tenant_id != request.tenant.id:
            self.message = "You do not belong to this organization."
            return False

        if request.user.is_authenticated and request.tenant.id == request.user.tenant_id:
            return True
        return False