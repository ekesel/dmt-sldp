from homepage.models import *
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from homepage.serializers import *
from rest_framework.parsers import MultiPartParser, FormParser
from homepage.permissions import IsManagerOrReadOnly,IsUser
import logging
from django.db.models import Avg, Sum
from data.models import DeveloperMetrics
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

# Organization Chart Api
class OrgChartAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = OrgChartSerializer(data=request.data)
        logger.info("Received request to upload organization chart")

        if serializer.is_valid():
            serializer.save(org_name=request.tenant.name)
            return Response(
                {'message': 'Organization chart uploaded successfully'},
                status=201
            )

        logger.error("Validation failed for organization chart upload")   
        return Response(serializer.errors, status=400)

    def get(self, request, id=None):
        if id:
            queryset = Org_chart.objects.filter(org_name=request.tenant.name, id=id).first()
            if not queryset:
                return Response({'message': 'Organization chart not found'}, status=404)
            serializer = OrgChartSerializer(queryset)
        else:
            queryset = Org_chart.objects.filter(org_name=request.tenant.name).order_by('-id')
            serializer = OrgChartSerializer(queryset, many=True)
        return Response(serializer.data, status=200)

    def patch(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = Org_chart.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Organization chart not found'},
                status=404
            )
        serializer = OrgChartSerializer(queryset, data=request.data, partial=True)
        if serializer.is_valid():
            if 'org_chart_file' in serializer.validated_data and queryset.org_chart_file:
                queryset.org_chart_file.delete(save=False)
            serializer.save()
            return Response(
                {'message': 'Organization chart updated successfully'},
                status=200
            )
        logger.error("Validation failed for organization chart update")   
        return Response(serializer.errors, status=400)

    def delete(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = Org_chart.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response({'message': 'Organization chart not found'}, status=404)
            
        if queryset.org_chart_file:
            queryset.org_chart_file.delete(save=False)
            
        queryset.delete()
        return Response({'message': 'Organization chart deleted successfully'}, status=200)

# Holiday Calendar API
class HolidayCalendarAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = HolidayCalendarSerializer(data=request.data)
        logger.info("Received request to upload holiday calendar")

        if serializer.is_valid():
            serializer.save(org_name=request.tenant.name)
            return Response(
                {'message': 'Holiday calendar uploaded successfully'},
                status=201
            )

        logger.error("Validation failed for holiday calendar upload")   
        return Response(serializer.errors, status=400)

    def get(self, request, id=None):
        if id:
            queryset = Holidaycalendar.objects.filter(org_name=request.tenant.name, id=id).first()
            if not queryset:
                return Response({'message': 'Holiday calendar not found'}, status=404)
            serializer = HolidayCalendarSerializer(queryset)
        else:
            queryset = Holidaycalendar.objects.filter(org_name=request.tenant.name).order_by('-id')
            serializer = HolidayCalendarSerializer(queryset, many=True)
        return Response(serializer.data, status=200)

    def patch(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = Holidaycalendar.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Holiday calendar not found'},
                status=404
            )
        serializer = HolidayCalendarSerializer(queryset, data=request.data, partial=True)
        if serializer.is_valid():
            if 'holiday_calendar_file' in serializer.validated_data and queryset.holiday_calendar_file:
                queryset.holiday_calendar_file.delete(save=False)
            serializer.save()
            return Response(
                {'message': 'Holiday calendar updated successfully'},
                status=200
            )
        logger.error("Validation failed for holiday calendar update")   
        return Response(serializer.errors, status=400)

    def delete(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = Holidaycalendar.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response({'message': 'Holiday calendar not found'}, status=404)
            
        if queryset.holiday_calendar_file:
            queryset.holiday_calendar_file.delete(save=False)
            
        queryset.delete()
        
        return Response({'message': 'Holiday calendar deleted successfully'}, status=200)

# Employee engagement calendar api
class EmployeeEngagementCalendarAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = EmployeeEngagementCalendarSerializer(data=request.data)
        logger.info("Received request to upload employee engagement calendar")

        if serializer.is_valid():
            serializer.save(org_name=request.tenant.name)
            return Response(
                {'message': 'Employee engagement calendar uploaded successfully'},
                status=201
            )

        logger.error("Validation failed for employee engagement calendar upload")   
        return Response(serializer.errors, status=400)

    def get(self, request, id=None):
        if id:
            queryset = EmployeeEngagementCalendar.objects.filter(org_name=request.tenant.name, id=id).first()
            if not queryset:
                return Response({'message': 'Employee engagement calendar not found'}, status=404)
            serializer = EmployeeEngagementCalendarSerializer(queryset)
        else:
            queryset = EmployeeEngagementCalendar.objects.filter(org_name=request.tenant.name).order_by('-id')
            serializer = EmployeeEngagementCalendarSerializer(queryset, many=True)
        return Response(serializer.data, status=200)

    def patch(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = EmployeeEngagementCalendar.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Employee engagement calendar not found'},
                status=404
            )
        serializer = EmployeeEngagementCalendarSerializer(queryset, data=request.data, partial=True)
        if serializer.is_valid():
            if 'employee_engagement_calendar_file' in serializer.validated_data and queryset.employee_engagement_calendar_file:
                queryset.employee_engagement_calendar_file.delete(save=False)
            serializer.save()
            return Response(
                {'message': 'Employee engagement calendar updated successfully'},
                status=200
            )
        logger.error("Validation failed for employee engagement calendar update")   
        return Response(serializer.errors, status=400)

    def delete(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = EmployeeEngagementCalendar.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response({'message': 'Employee engagement calendar not found'}, status=404)
            
        if queryset.employee_engagement_calendar_file:
            queryset.employee_engagement_calendar_file.delete(save=False)
            
        queryset.delete()
        return Response({'message': 'Employee engagement calendar deleted successfully'}, status=200)

# Policy Api
class PolicyAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = PolicySerializer(data=request.data)
        logger.info("Received request to upload policy")

        if serializer.is_valid():
            serializer.save(org_name=request.tenant.name)
            return Response(
                {'message': 'Policy uploaded successfully'},
                status=201
            )

        logger.error("Validation failed for policy upload")   
        return Response(serializer.errors, status=400)

    def get(self, request, id=None):
        if id:
            queryset = Policy.objects.filter(org_name=request.tenant.name, id=id).first()
            if not queryset:
                return Response({'message': 'Policy not found'}, status=404)
            serializer = PolicySerializer(queryset)
        else:
            queryset = Policy.objects.filter(org_name=request.tenant.name).order_by('-id')
            serializer = PolicySerializer(queryset, many=True)
        return Response(serializer.data, status=200)

    def patch(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = Policy.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Policy not found'},
                status=404
            )
        serializer = PolicySerializer(queryset, data=request.data, partial=True)
        if serializer.is_valid():
            if 'policy_file' in serializer.validated_data and queryset.policy_file:
                queryset.policy_file.delete(save=False)
            serializer.save()
            return Response(
                {'message': 'Policy updated successfully'},
                status=200
            )
        logger.error("Validation failed for policy update")   
        return Response(serializer.errors, status=400)

    def delete(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = Policy.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Policy not found'},
                status=404
            )
            
        if queryset.policy_file:
            queryset.policy_file.delete(save=False)
            
        queryset.delete()
        return Response(
            {'message': 'Policy deleted successfully'},
            status=200
        )



# star Profomer -
class LeaderDashboardAPIView(APIView):
    permission_classes = [IsUser]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        now = timezone.now()

        # Try to get data for the current month
        base_qs = DeveloperMetrics.objects.filter(
            sprint_end_date__year=now.year,
            sprint_end_date__month=now.month
        )

        if project_id:
            try:
                project_id = int(project_id)
            except ValueError:
                return Response({'message': 'Invalid project_id. Must be a number.'}, status=400)
            base_qs = base_qs.filter(project_id=project_id)
            
        # Fallback to all-time data if no records exist for the current month (and project)
        if not base_qs.exists():
            base_qs = DeveloperMetrics.objects.all()
            if project_id:
                base_qs = base_qs.filter(project_id=project_id)
            
        # 1. Highest Compliance
        quality_winner = base_qs.filter(items_completed__gt=0).values('developer_email', 'developer_name').annotate(
            score=Avg('dmt_compliance_rate'),
            coverage=Avg('coverage_avg_percent')
        ).order_by('-score', '-coverage').first()

        # 2. Most Points
        velocity_winner = base_qs.values('developer_email', 'developer_name').annotate(
            score=Sum('story_points_completed')
        ).order_by('-score').first()

        # 3. Top Reviewer
        reviewer_winner = base_qs.values('developer_email', 'developer_name').annotate(
            score=Sum('prs_reviewed')
        ).order_by('-score').first()

        # 4. AI Specialist
        ai_winner = base_qs.values('developer_email', 'developer_name').annotate(
            score=Avg('ai_usage_percent')
        ).order_by('-score').first()

        def attach_avatar(winner):
            from users.models import User
            if not winner:
                return winner
            email = winner.get('developer_email')
            winner['profile_picture'] = None
            if email:
                user = User.objects.filter(email=email).first()
                if user and user.profile_picture:
                    winner['profile_picture'] = request.build_absolute_uri(user.profile_picture.url)
            return winner

        return Response({
            'message': 'Leaderboard data',
            'top_performers': {
                'quality': attach_avatar(quality_winner),
                'velocity': attach_avatar(velocity_winner),
                'reviewer': attach_avatar(reviewer_winner),
                'ai': attach_avatar(ai_winner)
            }
        }, status=200)