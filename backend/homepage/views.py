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
        logger.info(request.data)

        if serializer.is_valid():
            serializer.save(org_name=request.tenant.name)
            return Response(
                {'message': 'Organization chart uploaded successfully'},
                status=201
            )

        logger.error(serializer.errors)   
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

    def patch(self, request, id):
        queryset = Org_chart.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Organization chart not found'},
                status=404
            )
        serializer = OrgChartSerializer(queryset, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'Organization chart updated successfully'},
                status=200
            )
        logger.error(serializer.errors)   
        return Response(serializer.errors, status=400)

    def delete(self, request, id):
        queryset = Org_chart.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response({'message': 'Organization chart not found'}, status=404)
        queryset.delete()
        return Response({'message': 'Organization chart deleted successfully'}, status=200)

# Holiday Calendar API
class HolidayCalendarAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = HolidayCalendarSerializer(data=request.data)
        logger.info(request.data)

        if serializer.is_valid():
            serializer.save(org_name=request.tenant.name)
            return Response(
                {'message': 'Holiday calendar uploaded successfully'},
                status=201
            )

        logger.error(serializer.errors)   
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

    def patch(self, request, id):
        queryset = Holidaycalendar.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Holiday calendar not found'},
                status=404
            )
        serializer = HolidayCalendarSerializer(queryset, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'Holiday calendar updated successfully'},
                status=200
            )
        logger.error(serializer.errors)   
        return Response(serializer.errors, status=400)

    def delete(self, request, id):
        queryset = Holidaycalendar.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response({'message': 'Holiday calendar not found'}, status=404)
        queryset.delete()
        return Response({'message': 'Holiday calendar deleted successfully'}, status=200)

# Employee engagement calendar api
class EmployeeEngagementCalendarAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = EmployeeEngagementCalendarSerializer(data=request.data)
        logger.info(request.data)

        if serializer.is_valid():
            serializer.save(org_name=request.tenant.name)
            return Response(
                {'message': 'Employee engagement calendar uploaded successfully'},
                status=201
            )

        logger.error(serializer.errors)   
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

    def patch(self, request, id):
        queryset = EmployeeEngagementCalendar.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Employee engagement calendar not found'},
                status=404
            )
        serializer = EmployeeEngagementCalendarSerializer(queryset, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'Employee engagement calendar updated successfully'},
                status=200
            )
        logger.error(serializer.errors)   
        return Response(serializer.errors, status=400)

    def delete(self, request, id):
        queryset = EmployeeEngagementCalendar.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response({'message': 'Employee engagement calendar not found'}, status=404)
        queryset.delete()
        return Response({'message': 'Employee engagement calendar deleted successfully'}, status=200)

# Policy Api
class PolicyAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = PolicySerializer(data=request.data)
        logger.info(request.data)

        if serializer.is_valid():
            serializer.save(org_name=request.tenant.name)
            return Response(
                {'message': 'Policy uploaded successfully'},
                status=201
            )

        logger.error(serializer.errors)   
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

    def patch(self, request, id):
        queryset = Policy.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Policy not found'},
                status=404
            )
        serializer = PolicySerializer(queryset, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'Policy updated successfully'},
                status=200
            )
        logger.error(serializer.errors)   
        return Response(serializer.errors, status=400)

    def delete(self, request, id):
        queryset = Policy.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Policy not found'},
                status=404
            )
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

        # FIX: If there is no data for the current month, fallback to all-time data
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
            import hashlib
            if not winner:
                return winner
            email = winner.get('developer_email')
            if email:
                email_hash = hashlib.md5(email.strip().lower().encode('utf-8')).hexdigest()
                winner['profile_picture'] = f"https://www.gravatar.com/avatar/{email_hash}?d=identicon"
            else:
                winner['profile_picture'] = None
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