from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django_tenants.utils import schema_context
from django.db import transaction
from django.utils.dateparse import parse_date
from configuration.models import CompanyBaseline, WorkloadSettingsVersion
from .serializers import CompanyBaselineSerializer, WorkloadSettingsVersionSerializer

class CompanyBaselineView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        """API endpoint to get the company baseline"""

        try:
            with schema_context('public'):
                baseline = CompanyBaseline.objects.first()
                if not baseline:    
                    # Lazily create the single baseline object with its default values for the platform
                    baseline = CompanyBaseline.objects.create()
                serializer = CompanyBaselineSerializer(baseline)
                data = serializer.data
            return Response({"status_code":200,"message":"success","data":data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"status_code":500, "message":str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):

        """
        API endpoint to create or update the company baseline.
        Workload settings: {"workload_settings": {...}, "workload_settings_effective_from": "YYYY-MM-DD"}
        saves a version in effect from that date (default today) until the next one.
        """
        # Workload settings drive every developer's status, so only superadmins may change them.
        if 'workload_settings' in request.data and not request.user.is_superuser:
            return Response({"status_code":403,"message":"Only superadmins can change workload settings."}, status=status.HTTP_403_FORBIDDEN)
        if request.data.get('workload_settings_effective_from') and 'workload_settings' not in request.data:
            return Response({"status_code":400,"message":"Send workload_settings_effective_from together with workload_settings."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with schema_context('public'), transaction.atomic():
                workload = None
                if 'workload_settings' in request.data:
                    workload = WorkloadSettingsVersionSerializer(data={
                        'settings': request.data['workload_settings'],
                        'effective_from': request.data.get('workload_settings_effective_from'),
                    })
                    if not workload.is_valid():
                        return Response({"status_code":400,"message":"error", "data":workload.errors}, status=status.HTTP_400_BAD_REQUEST)
                baseline = CompanyBaseline.objects.first()
                if not baseline:
                    serializer = CompanyBaselineSerializer(data=request.data)
                else:
                    serializer = CompanyBaselineSerializer(baseline, data=request.data, partial=True)
                if serializer.is_valid():
                    if workload:
                        workload.save(request.user)
                    if not baseline:
                        serializer.save(created_by=request.user)
                    else:
                        serializer.save()
                    data = serializer.data
                    return Response({"status_code":200 if baseline else 201,"message":"success", "data":data}, status=status.HTTP_200_OK if baseline else status.HTTP_201_CREATED)
            return Response({"status_code":400,"message":"error", "data":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"status_code":500,"message":str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request):
        return self.post(request)

    def delete(self, request):
        """Remove a wrongly saved workload settings version: ?workload_settings_effective_from=YYYY-MM-DD (superadmin)."""
        if not request.user.is_superuser:
            return Response({"status_code":403,"message":"Only superadmins can change workload settings."}, status=status.HTTP_403_FORBIDDEN)
        try:
            day = parse_date(request.query_params.get('workload_settings_effective_from') or '')
        except ValueError:
            day = None
        if not day:
            return Response({"status_code":400,"message":"workload_settings_effective_from must be YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        with schema_context('public'):
            deleted, _ = WorkloadSettingsVersion.objects.filter(effective_from=day).delete()
            if not deleted:
                return Response({"status_code":404,"message":"No workload settings saved on that date."}, status=status.HTTP_404_NOT_FOUND)
            baseline = CompanyBaseline.objects.first() or CompanyBaseline.objects.create()
            data = CompanyBaselineSerializer(baseline).data
        return Response({"status_code":200,"message":"success","data":data}, status=status.HTTP_200_OK)
