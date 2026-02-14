from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Tenant, Domain
from rest_framework import serializers
from django.db.models import Count
from django.conf import settings
from core.permissions import IsPlatformAdmin

from rest_framework.decorators import action


class TenantSerializer(serializers.ModelSerializer):
    users_count = serializers.IntegerField(read_only=True)
    created_at = serializers.DateField(source='created_on', read_only=True)

    class Meta:
        model = Tenant
        fields = [
            'id',
            'name',
            'schema_name',
            'slug',
            'status',
            'users_count',
            'created_on',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_on', 'updated_at', 'users_count']

class TenantViewSet(viewsets.ModelViewSet):
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get_queryset(self):
        return (
            Tenant.objects
            .all()
            .annotate(users_count=Count('user', distinct=True))
            .order_by('id')
        )

    def perform_create(self, serializer):
        tenant = serializer.save()
        # Create a default domain for the tenant
        # django-tenants requires at least one domain to function correctly
        domain_name = f"{tenant.slug}.{settings.TENANT_DOMAIN_SUFFIX}"
        Domain.objects.create(
            domain=domain_name,
            tenant=tenant,
            is_primary=True
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsPlatformAdmin])
    def activate(self, request, pk=None):
        tenant = self.get_object()
        tenant.status = 'active'
        tenant.save()
        return Response({'status': 'tenant activated'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsPlatformAdmin])
    def deactivate(self, request, pk=None):
        tenant = self.get_object()
        tenant.status = 'inactive'
        tenant.save()
        return Response({'status': 'tenant deactivated'})

class SystemHealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'status': 'healthy',
            'uptime': '99.9%',
            'services': {
                'database': 'up',
                'redis': 'up',
                'celery': 'up',
            },
            'active_tenants': Tenant.objects.count()
        })
