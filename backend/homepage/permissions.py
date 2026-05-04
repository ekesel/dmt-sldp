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
        if hasattr(request, 'tenant') and hasattr(request.user, 'tenant'):
            if request.user.tenant_id != request.tenant.id:
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

class IsUser(BasePermission):
    message = "You are not authorized to perform this action."

    def has_permission(self, request, view):
        if hasattr(request, 'tenant') and hasattr(request.user, 'tenant'):
            if request.user.tenant_id != request.tenant.id:
                self.message = "You do not belong to this organization."
                return False

        if request.user.is_authenticated and request.tenant.id == request.user.tenant_id:
            return True
        return False