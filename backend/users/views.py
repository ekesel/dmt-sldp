from core.permissions import IsAdminUser, IsManager
from re import I
from rest_framework_simplejwt import authentication
import os
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.conf import settings
from .serializers import UserSerializer, RegisterSerializer, CustomTokenObtainPairSerializer
from users.utils import import_users_from_excel
from rest_framework import viewsets
from .models import RoleTable
from .serializers import RoleSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from homepage.permissions import IsManagerOrReadOnly



from .models import User, RoleTable
User = get_user_model()

import logging
logger = logging.getLogger(__name__)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users from the admin portal.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        tenant = getattr(user, 'tenant', None)
        is_platform_admin = getattr(user, 'is_platform_admin', False)

        # 1. Base filtering by user's own tenant (if not platform admin)
        if is_platform_admin:
            queryset = User.objects.all().order_by('-id')
        elif tenant:
            queryset = User.objects.filter(tenant=tenant).order_by('-id')
        else:
            return User.objects.none()

        # 2. Optional target tenant filtering (for platform admins switching views)
        target_tenant = self.request.query_params.get('tenant_id') or self.request.query_params.get('tenant')
        if target_tenant:
             # Ensure user has access: either platform admin or it's their own tenant
             if is_platform_admin or (tenant and str(tenant.id) == str(target_tenant)):
                queryset = queryset.filter(tenant_id=target_tenant)
             else:
                return User.objects.none()
        
        return queryset

    def perform_create(self, serializer):
        # Hierarchical check: Only superusers can set is_superuser or is_platform_admin
        if not self.request.user.is_superuser:
            serializer.validated_data['is_superuser'] = False
            # If they aren't even platform admin, they shouldn't set is_platform_admin
            if not self.request.user.is_platform_admin:
                 serializer.validated_data['is_platform_admin'] = False

        # Target tenant identification priority:
        # 1. Explicit 'tenant' from payload
        # 2. current admin's own tenant (if any)
        # 3. 'X-Tenant' header (for platform admins switching views)
        
        target_tenant = serializer.validated_data.get('tenant')
        
        if not target_tenant:
            user_tenant = getattr(self.request.user, 'tenant', None)
            if user_tenant:
                target_tenant = user_tenant
            else:
                # Platform admins using the dashboard switch
                tenant_id = self.request.headers.get('X-Tenant')
                if tenant_id:
                    from tenants.models import Tenant
                    try:
                        from django.db.models import Q
                        if tenant_id.isdigit():
                            target_tenant = Tenant.objects.get(id=tenant_id)
                        else:
                            target_tenant = Tenant.objects.get(Q(slug=tenant_id) | Q(schema_name=tenant_id))
                    except Tenant.DoesNotExist:
                        pass

        if target_tenant:
            serializer.save(tenant=target_tenant)
        else:
            serializer.save()

    def perform_update(self, serializer):
        # Hierarchical check: Only superusers can set is_superuser or is_platform_admin
        if not self.request.user.is_superuser:
            # Prevent promotion to superuser
            if serializer.validated_data.get('is_superuser'):
                serializer.validated_data['is_superuser'] = serializer.instance.is_superuser
            
            # Prevent promotion to platform_admin if they aren't one themselves
            if not self.request.user.is_platform_admin:
                if serializer.validated_data.get('is_platform_admin'):
                    serializer.validated_data['is_platform_admin'] = serializer.instance.is_platform_admin

        serializer.save()


class RegisterView(APIView):
    """
    User registration endpoint for the admin portal.
    POST: Create a new admin user
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    'user': UserSerializer(user).data,
                    'message': 'User registered successfully. Please login.'
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Enhanced token endpoint that returns user info along with tokens.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class UserProfileView(APIView):
    """
    Get or update current user profile information.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """
    Logout endpoint (for frontend to clear tokens).
    Simply returns success - actual logout is handled by removing tokens client-side.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(
            {'message': 'Logged out successfully'},
            status=status.HTTP_200_OK
        )


class InviteUserView(APIView):
    """
    POST /api/users/{id}/invite/
    Activates a synced (is_active=False) user and returns a password-set link
    so the assignee can log into the company portal.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            # Restrict to same tenant
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Only admin or platform admins can invite
        requester = request.user
        if not requester.is_platform_admin and getattr(requester, 'tenant', None) != getattr(user, 'tenant', None):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        # Activate the user
        user.is_active = True
        user.save(update_fields=['is_active'])

        # Generate a single-use password-reset token
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Build the invite URL (frontend handles the set-password page)
        frontend_base = getattr(settings, 'FRONTEND_URL', os.environ.get('FRONTEND_URL', 'http://localhost:3000'))
        
        tenant = getattr(user, 'tenant', None)
        if tenant:
            domain_obj = tenant.domains.first()
            if domain_obj:
                from urllib.parse import urlparse, urlunparse
                parsed = urlparse(frontend_base)
                port = parsed.port
                new_netloc = domain_obj.domain
                if port:
                    # If dealing with localhost locally
                    if domain_obj.domain.endswith('.localhost') or domain_obj.domain == 'localhost':
                        new_netloc = f"{domain_obj.domain}:{port}"
                    # Usually in prod domain won't need port unless specified, but let's be safe
                    elif ':' not in domain_obj.domain and port not in (80, 443):
                        new_netloc = f"{domain_obj.domain}:{port}"
                frontend_base = urlunparse((parsed.scheme, new_netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))

        invite_link = f"{frontend_base}/set-password?uid={uid}&token={token}"

        return Response({
            'message': f'Invite sent to {user.email or user.username}',
            'invite_link': invite_link,   # Admin can share this manually
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset-request/
    Accepts an email. Finds the user and creates a Notification for the tenant's admins
    so they can invite/reset the user's password.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_request)

        # Find the user, allowing inactive users so admins get notified to invite them
        user = User.objects.filter(email=email).first()
        if not user:
            # For security, return success even if user not found to prevent email enumeration
            return Response({'message': 'If an account exists with this email, admins have been notified.'}, status=status.HTTP_200_OK)

        # Find admins for this user's tenant (or platform admins)
        from notifications.models import Notification
        
        tenant = getattr(user, 'tenant', None)
        admins = User.objects.none()
        
        if tenant:
            admins = admins | User.objects.filter(tenant=tenant, is_staff=True)
            
        # Always include platform admins and superusers
        admins = admins | User.objects.filter(is_platform_admin=True)
        admins = admins | User.objects.filter(is_superuser=True)
        
        admins = admins.distinct()

        # Create notification for each admin
        for admin in admins:
            Notification.objects.create(
                user=admin,
                tenant=tenant,
                title="URGENT: Password Reset Request",
                message=(
                    f"User {user.email} has requested a password reset. "
                    f"Please generate a reset link immediately from the Users list by using the 'Invite' action (Mail icon)."
                ),
                notification_type=Notification.TYPE_PASSWORD_RESET,
                data={'requested_by_user_id': user.id, 'requested_by_email': user.email}
            )

        return Response({'message': 'If an account exists with this email, admins have been notified.'}, status=status.HTTP_200_OK)


class ResetPasswordConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Accepts uid, token, and new_password. Validates and sets new password.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not all([uidb64, token, new_password]):
            return Response({'error': 'Missing uid, token, or new_password'}, status=status.HTTP_400_BAD_request)

        try:
            from django.utils.http import urlsafe_base64_decode
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password has been reset successfully'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)






class UploadUserDataView(APIView):
    """
    POST /api/users/upload/
    Accepts a file-like object (Excel) and imports users.

    - Admin users: must pass `tenant_id` in the request body to specify which tenant to upload for.
    - Manager users: always upload for their own tenant (tenant_id is ignored).
    """
    permission_classes = [IsAdminUser | IsManager]

    def post(self, request):
        from tenants.models import Tenant

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user

        # Admin can specify any tenant via tenant_id in the request body
        if user.is_superuser or user.is_platform_admin:
            tenant_id = request.data.get('tenant_id')
            if not tenant_id:
                return Response(
                    {'error': 'Admin must provide tenant_id to specify which tenant to upload for.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return Response({'error': f'Tenant with id={tenant_id} not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Manager: use their own tenant
            tenant = user.tenant
            if not tenant:
                return Response({'error': 'No tenant found for your account.'}, status=status.HTTP_400_BAD_REQUEST)

        result = import_users_from_excel(file_obj, tenant=tenant)

        if result['success']:
            return Response(
                {
                    'message': 'Upload completed',
                    'stats': result['stats']
                },
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': result.get('error', 'Unknown error occurred'), 'stats': result.get('stats', {})},
                status=status.HTTP_400_BAD_REQUEST
            )




class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsManagerOrReadOnly]
    queryset = RoleTable.objects.all().order_by('-id')
    serializer_class = RoleSerializer





# ORG CHART API
class UserHierarchyAPIView(APIView):

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsManagerOrReadOnly()]

    # CYCLE DETECTION — prevents circular chains (e.g. A→B→C→A)
    def would_create_cycle(self, user_id, new_parent_id):
        current_id = new_parent_id
        visited = set()
        while current_id is not None:
            if current_id in visited:
                break
            if current_id == user_id:
                return True
            visited.add(current_id)
            current_id = User.objects.filter(id=current_id).values_list('parent_id', flat=True).first()
        return False

    # BUILD HIERARCHY — O(n) using pre-grouped dict (Fix #3)
    def build_hierarchy(self, users, parent_id=None):

        # Group all users by their parent_id in one pass
        children_map = {}
        for user in users:
            pid = user.parent_id
            children_map.setdefault(pid, []).append(user)

        def build(pid):
            result = []
            for user in children_map.get(pid, []):
                result.append({
                    "id": user.id,
                    "full_name": f"{user.first_name} {user.last_name}".strip(),
                    "email": user.email,
                    "username": user.username,
                    "role_id": user.role.id if user.role else None,
                    "role": user.role.role_name if user.role else None,
                    "department": user.role.dep_name if user.role else None,
                    "parent_id": user.parent_id,
                    "is_active": user.is_active,
                    "children": build(user.id)
                })
            return result

        return build(parent_id)


    # GET -> FULL HIERARCHY
    def get(self, request):

        # Fix #4: filter active users at DB level — avoid loading inactive users
        users = User.objects.select_related('role').filter(
            tenant=request.user.tenant,
            is_active=True
        )

        hierarchy = self.build_hierarchy(users)

        return Response({
            "status": True,
            "message": "Hierarchy fetched successfully",
            "data": hierarchy
        }, status=status.HTTP_200_OK)

    # POST -> CREATE USER / UPDATE EXISTING USER
    def post(self, request):

        data = request.data
        tenant = request.user.tenant

        email = data.get("email")

        # Email required
        if not email:
            return Response({
                "status": False,
                "message": "Email is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # GET ROLE  (frontend sends role ID)
        role_obj = None

        designation = data.get("designation")  # expects RoleTable pk (integer)

        if designation:
            role_obj = RoleTable.objects.filter(
                id=designation
            ).first()

            if not role_obj:
                return Response({
                    "status": False,
                    "message": f"Role with id={designation} not found"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate dep_name if frontend sends it
            dep_name = data.get("dep_name")
            if dep_name:
                # Fix #2: validate against allowed choices before saving
                valid_choices = [c[0] for c in RoleTable.DepartmentChoices.choices]
                if dep_name not in valid_choices:
                    return Response({
                        "status": False,
                        "message": f"Invalid department '{dep_name}'. Valid choices: {valid_choices}"
                    }, status=status.HTTP_400_BAD_REQUEST)
                # keep dep_name immutable here; role metadata should be changed only via role-management endpoint

        # GET PARENT USER
        parent_user = None

        parent_id = data.get("parent")

        if parent_id:

            parent_user = User.objects.filter(
                id=parent_id,
                tenant=tenant,
                is_active=True
            ).first()

            if not parent_user:
                return Response({
                    "status": False,
                    "message": "Parent user not found"
                }, status=status.HTTP_400_BAD_REQUEST)

        # CHECK EXISTING USER
        existing_user = User.objects.filter(
            email=email,
            tenant=tenant
        ).first()

        # UPDATE EXISTING USER
        if existing_user:

            if role_obj:
                existing_user.role = role_obj

            # Fix #5: only update parent if explicitly sent — prevent silent wipe
            if "parent" in data:
                if parent_id == existing_user.id:
                    return Response({
                        "status": False,
                        "message": "User cannot be parent of itself"
                    }, status=status.HTTP_400_BAD_REQUEST)

                if parent_id and self.would_create_cycle(existing_user.id, parent_id):
                    return Response({
                        "status": False,
                        "message": "This parent assignment would create a circular hierarchy"
                    }, status=status.HTTP_400_BAD_REQUEST)

                existing_user.parent = parent_user

            existing_user.save()

            return Response({
                "status": True,
                "message": "Existing user updated successfully",
                "data": {
                    "id": existing_user.id,
                    "full_name": f"{existing_user.first_name} {existing_user.last_name}".strip(),
                    "email": existing_user.email,
                    "role": existing_user.role.role_name if existing_user.role else None,
                    "department": existing_user.role.dep_name if existing_user.role else None,
                }
            }, status=status.HTTP_200_OK)

        #   CREATE NEW USER
        try:

            user = User.objects.create_user(
                tenant=tenant,
                username=email,
                email=email,
                first_name=data.get("first_name", ""),
                last_name=data.get("last_name", ""),
                role=role_obj,
                parent=parent_user,
                is_active=True
            )

            # Disable password login initially
            user.set_unusable_password()
            user.save(update_fields=['password'])

            return Response({
                "status": True,
                "message": "Employee created successfully",
                "data": {
                    "id": user.id,
                    "full_name": f"{user.first_name} {user.last_name}".strip(),
                    "email": user.email,
                    # Fix #1: use role_obj directly (already in memory) to avoid null department
                    "role": role_obj.role_name if role_obj else None,
                    "department": role_obj.dep_name if role_obj else None,
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Fix #7: log the real error instead of swallowing it
            logger.exception("User creation failed for email=%s: %s", email, str(e))
            return Response({
                "status": False,
                "message": "Could not create user"
            }, status=status.HTTP_400_BAD_REQUEST)

    # PUT -> UPDATE USER
    def put(self, request, pk):

        try:
            user = User.objects.get(
                id=pk,
                tenant=request.user.tenant
            )

        except User.DoesNotExist:

            return Response({
                "status": False,
                "message": "User not found"
            }, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        # Update first name
        if "first_name" in data:
            user.first_name = data.get("first_name")

        # Update last name
        if "last_name" in data:
            user.last_name = data.get("last_name")

        # Update role  (frontend sends role ID)
        if "designation" in data:

            designation = data.get("designation")
            role_obj = None

            if designation:
                role_obj = RoleTable.objects.filter(
                    id=designation
                ).first()

                if not role_obj:
                    return Response({
                        "status": False,
                        "message": f"Role with id={designation} not found"
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Validate dep_name if frontend sends it — validate choices (Fix #2)
                dep_name = data.get("dep_name")
                if dep_name:
                    valid_choices = [c[0] for c in RoleTable.DepartmentChoices.choices]
                    if dep_name not in valid_choices:
                        return Response({
                            "status": False,
                            "message": f"Invalid department '{dep_name}'. Valid choices: {valid_choices}"
                        }, status=status.HTTP_400_BAD_REQUEST)
                    # keep dep_name immutable here; role metadata should be changed only via role-management endpoint

            user.role = role_obj

        # Update parent
        if "parent" in data:

            parent_id = data.get("parent")

            # Prevent self-parenting
            if parent_id == user.id:
                return Response({
                    "status": False,
                    "message": "User cannot be parent of itself"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate parent exists and check for circular chains (Fix #6)
            if parent_id:

                parent_exists = User.objects.filter(
                    id=parent_id,
                    tenant=request.user.tenant,
                    is_active=True
                ).exists()

                if not parent_exists:
                    return Response({
                        "status": False,
                        "message": "Parent user not found"
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Fix #6: detect circular hierarchy (e.g. A→B→C→A)
                if self.would_create_cycle(user.id, parent_id):
                    return Response({
                        "status": False,
                        "message": "This parent assignment would create a circular hierarchy"
                    }, status=status.HTTP_400_BAD_REQUEST)

            user.parent_id = parent_id

        # Update active status
        if "is_active" in data:
            user.is_active = data.get("is_active")

        user.save()

        user.refresh_from_db()

        return Response({
            "status": True,
            "message": "User updated successfully",
            "data": {
                "id": user.id,
                "full_name": f"{user.first_name} {user.last_name}".strip(),
                "email": user.email,
                "role": user.role.role_name if user.role else None,
                "department": user.role.dep_name if user.role else None,
            }
        }, status=status.HTTP_200_OK)

    #   DELETE -> SOFT DELETE
    def delete(self, request, pk):

        try:
            user = User.objects.get(
                id=pk,
                tenant=request.user.tenant
            )

        except User.DoesNotExist:

            return Response({
                "status": False,
                "message": "User not found"
            }, status=status.HTTP_404_NOT_FOUND)

        user.is_active = False
        user.save()

        return Response({
            "status": True,
            "message": "User soft deleted successfully"
        }, status=status.HTTP_200_OK)



# USER DROPDOWN API

class GetAllUsersDropdown(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        users = User.objects.select_related('role').filter(
            tenant=request.user.tenant,
            is_active=True
        )

        list_data = []

        for user in users:

            list_data.append({
                "id": user.id,
                "full_name": f"{user.first_name} {user.last_name}".strip(),
                "email": user.email,
                "role": user.role.role_name if user.role else None,
                "department": user.role.dep_name if user.role else None,
            })

        return Response({
            "status": True,
            "data": list_data
        }, status=status.HTTP_200_OK)