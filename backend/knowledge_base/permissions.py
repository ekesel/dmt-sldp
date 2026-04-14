from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsManager(BasePermission):
    """
    Permission class to allow only managers to perform actions.
    """
    message = "Only managers are allowed to perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'is_manager', False))

class IsManagerOrReadOnly(BasePermission):
    """
    Allows read-only access to authenticated users, but only managers can perform write operations.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        if request.method in SAFE_METHODS:
            return True
            
        return getattr(request.user, 'is_manager', False)