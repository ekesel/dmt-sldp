from rest_framework import viewsets, permissions
from .models import Project, SourceConfiguration
from .serializers import ProjectSerializer, SourceConfigurationSerializer
from rest_framework.decorators import action
from rest_framework.response import Response

class ProjectViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows projects to be viewed or edited.
    Standard access: Tenants see their own projects. Platform admins see al.
    """
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        tenant = getattr(user, 'tenant', None)
        is_platform_admin = getattr(user, 'is_platform_admin', False)

        # 1. Base filtering by user's own tenant (if not platform admin)
        if is_platform_admin:
            queryset = Project.objects.all()
        elif tenant:
            queryset = Project.objects.filter(tenant=tenant)
        else:
            return Project.objects.none()

        # 2. Optional target tenant filtering (for platform admins switching views)
        target_tenant = self.request.query_params.get('tenant_id') or self.request.query_params.get('tenant')
        if target_tenant:
             # Ensure user has access: either platform admin or it's their own tenant
             if is_platform_admin or (tenant and str(tenant.id) == str(target_tenant)):
                queryset = queryset.filter(tenant_id=target_tenant)
             else:
                return Project.objects.none()
        
        return queryset

    def perform_create(self, serializer):
        # Auto-assign tenant if not provided (and user belongs to one)
        user_tenant = getattr(self.request.user, 'tenant', None)
        if not serializer.validated_data.get('tenant') and user_tenant:
             serializer.save(tenant=user_tenant)
        else:
             serializer.save()


class SourceConfigurationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing source configurations.
    """
    serializer_class = SourceConfigurationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        tenant = getattr(user, 'tenant', None)
        is_platform_admin = getattr(user, 'is_platform_admin', False)

        if is_platform_admin:
            queryset = SourceConfiguration.objects.all()
        elif tenant:
             queryset = SourceConfiguration.objects.filter(project__tenant=tenant)
        else:
            queryset = SourceConfiguration.objects.none()

        # Filter by project_id
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Optional filter by tenant_id for admins
        target_tenant = self.request.query_params.get('tenant_id') or self.request.query_params.get('tenant')
        if target_tenant:
            if is_platform_admin or (tenant and str(tenant.id) == str(target_tenant)):
                queryset = queryset.filter(project__tenant_id=target_tenant)
            else:
                return SourceConfiguration.objects.none()
        
        return queryset

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        source = self.get_object()
        from etl.factory import ConnectorFactory
        
        config = {
            'base_url': source.base_url,
            'api_token': source.api_key,
            'username': source.username,
        }
        
        connector = ConnectorFactory.get_connector(source.source_type, config)
        if not connector:
             return Response({'status': 'failed', 'message': 'Invalid source type'}, status=400)

        try:
            success = connector.test_connection()
            if success:
                return Response({'status': 'success', 'message': 'Connection successful'})
            else:
                return Response({'status': 'failed', 'message': 'Connection rejected by source'}, status=400)
        except Exception as e:
            return Response({'status': 'failed', 'message': str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def trigger_sync(self, request, pk=None):
        source = self.get_object()
        # Placeholder for triggering ETL sync
        # In Phase 2, this will trigger the Celery task
        return Response({'status': 'success', 'message': f'Sync triggered for {source.name} (Mocked)'})
