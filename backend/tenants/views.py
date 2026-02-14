from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Tenant, Domain, AuditLog, SystemSetting
from rest_framework import serializers
from django.db.models import Count
from django.conf import settings
from core.permissions import IsPlatformAdmin

from rest_framework.decorators import action
from django.db import connection
from django.core.cache import cache
from core.celery import app as celery_app
import datetime
import os


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
            'retention_work_items',
            'retention_ai_insights',
            'retention_pull_requests',
        ]
        read_only_fields = ['id', 'created_on', 'updated_at', 'users_count']

class RetentionPolicySerializer(serializers.ModelSerializer):
    work_items_months = serializers.IntegerField(source='retention_work_items')
    ai_insights_months = serializers.IntegerField(source='retention_ai_insights')
    pull_requests_months = serializers.IntegerField(source='retention_pull_requests')

    class Meta:
        model = Tenant
        fields = ['work_items_months', 'ai_insights_months', 'pull_requests_months']

class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ['name', 'value']

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
        domain_name = f"{tenant.slug}.{settings.TENANT_DOMAIN_SUFFIX}"
        Domain.objects.create(
            domain=domain_name,
            tenant=tenant,
            is_primary=True
        )
        
        # Create Audit Log
        if self.request.user and self.request.user.is_authenticated:
            AuditLog.objects.create(
                user=self.request.user,
                tenant=tenant,
                action='create',
                entity_type='tenant',
                entity_id=str(tenant.id),
                new_values=serializer.data
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

    @action(detail=True, methods=['get', 'patch'], permission_classes=[IsAuthenticated, IsPlatformAdmin], url_path='retention-policy')
    def retention_policy(self, request, pk=None):
        tenant = self.get_object()
        
        if request.method == 'PATCH':
            serializer = RetentionPolicySerializer(tenant, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = RetentionPolicySerializer(tenant)
        return Response(serializer.data)


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='user.username', read_only=True, default='System')

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'entity_type', 'entity_id', 'actor_name', 'timestamp']


class ActivityLogView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        logs = AuditLog.objects.all().select_related('user')[:4]
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)


class SystemHealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        services = {
            'database': 'down',
            'redis': 'down',
            'celery': 'down',
            'api_gateway': 'up',
        }

        # 1. Database Check
        try:
            connection.ensure_connection()
            services['database'] = 'up'
        except Exception:
            pass

        # 2. Redis Check
        try:
            cache.set('health_check', '1', timeout=5)
            if cache.get('health_check') == '1':
                services['redis'] = 'up'
        except Exception:
            pass

        # 3. Celery Check
        try:
            insp = celery_app.control.inspect()
            # ping() returns a map of {worker: response}
            ping_results = insp.ping()
            if ping_results and len(ping_results) > 0:
                services['celery'] = 'up'
        except Exception:
            pass

        # 4. System Load & Uptime
        load = 0
        uptime_str = 'N/A'
        try:
            import psutil
            load = psutil.cpu_percent()
            p = psutil.Process(os.getpid())
            start_time = datetime.datetime.fromtimestamp(p.create_time())
            diff = datetime.datetime.now() - start_time
            
            days = diff.days
            hours, remainder = divmod(diff.seconds, 3600)
            minutes, _ = divmod(remainder, 60)
            
            if days > 0:
                uptime_str = f"{days}d {hours}h {minutes}m"
            else:
                uptime_str = f"{hours}h {minutes}m"
        except Exception as e:
            pass

        return Response({
            'status': 'healthy' if all(s == 'up' for s in services.values()) else 'degraded',
            'uptime': uptime_str,
            'system_load': load,
            'services': services,
            'active_tenants': Tenant.objects.filter(status='active').count()
        })


class SystemSettingsView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        settings = SystemSetting.objects.all()
        # Convert to a simple key-value dict for easier frontend consumption
        data = {s.name: s.value for s in settings}
        return Response(data)

    def patch(self, request):
        # Expecting a dict of settings to update
        for name, value in request.data.items():
            SystemSetting.objects.update_or_create(
                name=name,
                defaults={'value': value}
            )
        
        # Return the updated settings
        settings = SystemSetting.objects.all()
        data = {s.name: s.value for s in settings}
        return Response(data)
