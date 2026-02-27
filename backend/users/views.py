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

User = get_user_model()


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
        # Auto-assign tenant if not provided (and user belongs to one)
        user_tenant = getattr(self.request.user, 'tenant', None)
        if not serializer.validated_data.get('tenant') and user_tenant:
             serializer.save(tenant=user_tenant)
        else:
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
    Get current user profile information.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


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
        frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
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

        # Find the active user
        user = User.objects.filter(email=email, is_active=True).first()
        if not user:
            # For security, return success even if user not found to prevent email enumeration
            return Response({'message': 'If an active account exists with this email, admins have been notified.'}, status=status.HTTP_200_OK)

        # Find admins for this user's tenant (or platform admins)
        from notifications.models import Notification
        
        tenant = getattr(user, 'tenant', None)
        if tenant:
            admins = User.objects.filter(tenant=tenant, is_staff=True)
        else:
            admins = User.objects.filter(is_platform_admin=True)

        if not admins.exists():
            admins = User.objects.filter(is_platform_admin=True)

        # Create notification for each admin
        for admin in admins:
            Notification.objects.create(
                user=admin,
                tenant=tenant,
                title="Password Reset Request",
                message=f"User {user.email} has requested a password reset. You can generate a reset link from the Users list by using the Invite action.",
                notification_type=Notification.TYPE_PASSWORD_RESET,
                data={'requested_by_user_id': user.id, 'requested_by_email': user.email}
            )

        return Response({'message': 'If an active account exists with this email, admins have been notified.'}, status=status.HTTP_200_OK)


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
