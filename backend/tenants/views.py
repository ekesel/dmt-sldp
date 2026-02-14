from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Tenant
from rest_framework import serializers

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'schema_name', 'created_on']

class TenantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated]

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
