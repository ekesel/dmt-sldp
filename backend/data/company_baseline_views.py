from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django_tenants.utils import schema_context
from configuration.models import CompanyBaseline
from .serializers import CompanyBaselineSerializer

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

        """API endpoint to create or update the company baseline"""
        try:
            with schema_context('public'):
                baseline = CompanyBaseline.objects.first()
                if not baseline:
                    serializer = CompanyBaselineSerializer(data=request.data)
                else:
                    serializer = CompanyBaselineSerializer(baseline, data=request.data, partial=True)
                if serializer.is_valid():
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

