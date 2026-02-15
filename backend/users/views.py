from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
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
