import pandas as pd
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SprintMetrics, DeveloperMetrics, WorkItem
from datetime import datetime

class ExportMixin:
    def export_excel(self, data, filename):
        df = pd.DataFrame(data)
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename={filename}.xlsx'
        df.to_excel(response, index=False)
        return response

class ExportSprintView(APIView, ExportMixin):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        sprint_id = request.data.get('sprint_name')
        if sprint_id:
            metrics = SprintMetrics.objects.filter(sprint_name=sprint_id).values()
        else:
            metrics = SprintMetrics.objects.all().values()
            
        return self.export_excel(list(metrics), f"sprint_metrics_{datetime.now().date()}")

class ExportDeveloperView(APIView, ExportMixin):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        metrics = DeveloperMetrics.objects.all().values()
        return self.export_excel(list(metrics), f"developer_metrics_{datetime.now().date()}")

class ExportComplianceView(APIView, ExportMixin):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        items = WorkItem.objects.filter(dmt_compliant=False).values(
            'external_id', 'title', 'assignee_name', 'compliance_failures'
        )
        return self.export_excel(list(items), f"compliance_report_{datetime.now().date()}")
