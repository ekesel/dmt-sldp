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
                
                # Notify all platform admins
                from django.contrib.auth import get_user_model
                from notifications.models import Notification
                User = get_user_model()
                admins = User.objects.filter(is_superuser=True)
                
                for admin in admins:
                    Notification.objects.create(
                        user=admin,
                        message=f"Retention policy updated for tenant {tenant.name}.",
                        notification_type='info'
                    )

                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = RetentionPolicySerializer(tenant)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsPlatformAdmin], url_path='archive-data')
    def archive_data(self, request, pk=None):
        tenant = self.get_object()
        
        # Trigger the retention policy check asynchronously
        from .tasks import run_retention_policy_check
        run_retention_policy_check.delay()
        
        # Create Audit Log
        if request.user:
            AuditLog.objects.create(
                user=request.user,
                tenant=tenant,
                action='archive_data',
                entity_type='tenant',
                entity_id=str(tenant.id)
            )

        # Notify the requesting user (and potentially others)
        from notifications.models import Notification
        Notification.objects.create(
            user=request.user,
            message=f"Data archival process started for {tenant.name}.",
            notification_type='success'
        )

        return Response({'status': 'Data archival started successfully.'})


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.ReadOnlyField(source='user.username')
    tenant_name = serializers.ReadOnlyField(source='tenant.name')

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'entity_type', 'entity_id', 'actor_name', 'tenant_name', 'timestamp', 'new_values']


from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination

class ActivityLogPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ActivityLogView(ListAPIView):
    """
    View to retrieve audit logs with filtering and pagination.
    Used by Activity page and dashboard widgets.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    pagination_class = ActivityLogPagination

    def get_queryset(self):
        queryset = AuditLog.objects.all().select_related('user', 'tenant').order_by('-timestamp')
        
        # Filtering
        tenant_id = self.request.query_params.get('tenant')
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
            
        action_val = self.request.query_params.get('action')
        if action_val:
            queryset = queryset.filter(action=action_val)
            
        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type__icontains=entity_type)
            
        return queryset


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


class ServiceDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request, service_name):
        # Mock detailed data for now. In a real application, you would connect to
        # the service's monitoring endpoint or retrieve metrics from a Prometheus/Grafana instance.
        
        # Base details available for all services
        details = {
            'name': service_name,
            'status': 'up',  # This should ideally be dynamically checked
            'version': '1.2.0',
            'uptime': '3d 12h 15m',
            'last_check': datetime.datetime.now().isoformat(),
            'logs': [
                {'timestamp': (datetime.datetime.now() - datetime.timedelta(minutes=5)).isoformat(), 'level': 'INFO', 'message': f'{service_name} service health check initiated.'},
                {'timestamp': (datetime.datetime.now() - datetime.timedelta(minutes=2)).isoformat(), 'level': 'INFO', 'message': 'Processing incoming request #10234.'},
                {'timestamp': datetime.datetime.now().isoformat(), 'level': 'INFO', 'message': 'Health check completed: OK.'},
            ]
        }
        
        # Service-specific metrics
        if service_name == 'database':
            details.update({
                'active_connections': 42,
                'queries_per_second': 125,
                'buffer_hit_ratio': '99.5%',
                'replication_lag': '0ms'
            })
        elif service_name == 'redis':
            details.update({
                'connected_clients': 15,
                'used_memory': '128MB',
                'hits': 4500,
                'misses': 120,
                'hit_rate': '97.4%'
            })
        elif service_name == 'celery':
            details.update({
                'active_workers': 4,
                'active_tasks': 2,
                'queued_tasks': 0,
                'processed_tasks_total': 15420
            })
        elif service_name == 'api_gateway':
            details.update({
                'requests_per_second': 45,
                'average_latency': '45ms',
                'error_rate': '0.01%',
                'active_sessions': 120
            })
            
        return Response(details)


class ServiceRestartView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request, service_name):
        # Mock restart process.
        # In a real production environment, this would likely trigger an Infrastructure-as-Code pipeline,
        # a specialized Celery task interacting with Kubernetes/Docker API, or a system command.
        
        # Log the action
        import logging
        logger = logging.getLogger(__name__)
        if request.user:
            logger.info(f"Service restart initiated for {service_name} by {request.user.username}")
            
        # Notify admins via notification system
        try:
            from notifications.models import Notification
            Notification.objects.create(
                user=request.user,
                message=f"Service restart initiated for: {service_name}",
                notification_type='warning'
            )
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            
        # Simulate a successful restart initiation
        return Response({
            'status': 'restart_initiated', 
            'message': f'Restart sequence for {service_name} has been initiated.',
            'estimated_time': '30s'
        })
