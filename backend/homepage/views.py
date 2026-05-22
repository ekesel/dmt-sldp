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
from django.db import transaction
from users.models import User
from users.serializers import UserSerializer 
from homepage.utils import get_birthday_info, get_anniversary_info, upcoming_birthday_info, upcoming_anniversary_info ,import_holidays_from_excel
from core.permissions import IsAdminUser, IsManager
from django_tenants.utils import schema_context
logger = logging.getLogger(__name__)



# Organization Chart Api
class OrgChartAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = OrgChartSerializer(data=request.data)
        logger.info("Received request to upload organization chart")

        if serializer.is_valid():
            with transaction.atomic():
                queryset = Org_chart.objects.filter(org_name=request.tenant.name)
                for obj in queryset:
                    if obj.org_chart_file:
                        obj.org_chart_file.delete(save=False)
                    obj.delete()

                obj = serializer.save(org_name=request.tenant.name,is_active=True)
        
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
            queryset = Org_chart.objects.filter(org_name=request.tenant.name, is_active=True)
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

# Holiday Calendar API
class HolidayCalendarAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = HolidayCalendarSerializer(data=request.data)
        logger.info("Received request to upload holiday calendar")

        if serializer.is_valid():
            with transaction.atomic():
                queryset = Holidaycalendar.objects.filter(org_name=request.tenant.name)
                for obj in queryset:
                    if obj.holiday_calendar_file:
                        obj.holiday_calendar_file.delete(save=False)
                    obj.delete()

                obj = serializer.save(org_name=request.tenant.name,is_active=True)
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
            queryset = Holidaycalendar.objects.filter(org_name=request.tenant.name, is_active=True)
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

# Employee engagement calendar api
class EmployeeEngagementCalendarAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = EmployeeEngagementCalendarSerializer(data=request.data)
        logger.info("Received request to upload employee engagement calendar")

        if serializer.is_valid():
            with transaction.atomic():
                queryset = EmployeeEngagementCalendar.objects.filter(org_name=request.tenant.name)
                for obj in queryset:
                    if obj.employee_engagement_calendar_file:
                        obj.employee_engagement_calendar_file.delete(save=False)
                    obj.delete()

                obj = serializer.save(org_name=request.tenant.name,is_active=True)
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
            queryset = EmployeeEngagementCalendar.objects.filter(org_name=request.tenant.name, is_active=True)
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


# Learning and Development Api
class LearningAndDevelopmentAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = LearningAndDevelopmentSerializer(data=request.data)
        logger.info("Received request to upload learning and development document")

        if serializer.is_valid():
            serializer.save(org_name=request.tenant.name)
            return Response(
                {'message': 'Learning and development document uploaded successfully'},
                status=201
            )

        logger.error("Validation failed for learning and development document upload")   
        return Response(serializer.errors, status=400)

    def get(self, request, id=None):
        if id:
            queryset = LearningAndDevelopment.objects.filter(org_name=request.tenant.name, id=id).first()
            if not queryset:
                return Response({'message': 'Learning and development document not found'}, status=404)
            serializer = LearningAndDevelopmentSerializer(queryset)
        else:
            queryset = LearningAndDevelopment.objects.filter(org_name=request.tenant.name).order_by('-id')
            serializer = LearningAndDevelopmentSerializer(queryset, many=True)
        return Response(serializer.data, status=200)

    def patch(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = LearningAndDevelopment.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Learning and development document not found'},
                status=404
            )
        serializer = LearningAndDevelopmentSerializer(queryset, data=request.data, partial=True)
        if serializer.is_valid():
            if 'learning_and_development_file' in serializer.validated_data and queryset.learning_and_development_file:
                queryset.learning_and_development_file.delete(save=False)
            serializer.save()
            return Response(
                {'message': 'Learning and development document updated successfully'},
                status=200
            )
        logger.error("Validation failed for learning and development document update")   
        return Response(serializer.errors, status=400)

    def delete(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = LearningAndDevelopment.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Learning and development document not found'},
                status=404
            )
            
        if queryset.learning_and_development_file:
            queryset.learning_and_development_file.delete(save=False)
            
        queryset.delete()
        return Response(
            {'message': 'Learning and development document deleted successfully'},
            status=200
        )


# Onboarding Api
class OnboardingAPIView(APIView):
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = OnboardingSerializer(data=request.data)
        logger.info("Received request to upload onboarding document")

        if serializer.is_valid():
            serializer.save(org_name=request.tenant.name)
            return Response(
                {'message': 'Onboarding document uploaded successfully'},
                status=201
            )

        logger.error("Validation failed for onboarding document upload")   
        return Response(serializer.errors, status=400)

    def get(self, request, id=None):
        if id:
            queryset = Onboarding.objects.filter(org_name=request.tenant.name, id=id).first()
            if not queryset:
                return Response({'message': 'Onboarding document not found'}, status=404)
            serializer = OnboardingSerializer(queryset)
        else:
            queryset = Onboarding.objects.filter(org_name=request.tenant.name).order_by('-id')
            serializer = OnboardingSerializer(queryset, many=True)
        return Response(serializer.data, status=200)

    def patch(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = Onboarding.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Onboarding document not found'},
                status=404
            )
        serializer = OnboardingSerializer(queryset, data=request.data, partial=True)
        if serializer.is_valid():
            if 'onboarding_file' in serializer.validated_data and queryset.onboarding_file:
                queryset.onboarding_file.delete(save=False)
            serializer.save()
            return Response(
                {'message': 'Onboarding document updated successfully'},
                status=200
            )
        logger.error("Validation failed for onboarding document update")   
        return Response(serializer.errors, status=400)

    def delete(self, request, id=None):
        if not id:
            return Response({'message': 'ID is required'}, status=400)
        queryset = Onboarding.objects.filter(org_name=request.tenant.name, id=id).first()
        if not queryset:
            return Response(
                {'message': 'Onboarding document not found'},
                status=404
            )
            
        if queryset.onboarding_file:
            queryset.onboarding_file.delete(save=False)
            
        queryset.delete()
        return Response(
            {'message': 'Onboarding document deleted successfully'},
            status=200
        )


from data.leaderboard_views import LeaderboardView

# star Profomer -
class StarPerformerAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        leaderboard_view = LeaderboardView()
        response = leaderboard_view.get(request)
        data = response.data
        
        current_data = data.get("current_month", {})
        past_data = data.get("past_month", {})

        # Check if current month has any winners
        has_winners = False
        for winners in current_data.values():
            if winners and len(winners) > 0:
                has_winners = True
                break
                
        active_data = current_data if has_winners else past_data
        message = "Current month top performers" if has_winners else "Past month top performers"
        
        top_performers = {}
        
        # Order of categories to process
        categories = ["quality", "velocity", "reviewer", "ai", "objective_ai", "throughput", "coverage", "clean_coder"]
        
        for category in categories:
            winners = active_data.get(category, [])
            top_performers[category] = [winners[0]] if winners and len(winners) > 0 else []

        return Response({
            "message": message,
            "top_performers": top_performers
        })


class EventsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today_birthdays = get_birthday_info(request.tenant)
        logger.info("today_birthdays", today_birthdays)
        TodayBirthdayList = []
        for obj in today_birthdays:
            TodayBirthdayList.append({
                "user": obj.first_name + " " + obj.last_name
            })

        upcoming_birthdays_raw = upcoming_birthday_info(request.tenant)
        logger.info("upcoming_birthdays_raw", upcoming_birthdays_raw)
        UpcomingBirthdayList = []
        for obj in upcoming_birthdays_raw:
            UpcomingBirthdayList.append({
                "user": obj["user"].first_name + " " + obj["user"].last_name,
                "days_left": obj["days_left"],
                "next_birthday": obj["next_birthday"]
            })
        
        upcoming_anniversaries_raw = upcoming_anniversary_info(request.tenant)
        logger.info("upcoming_anniversaries_raw", upcoming_anniversaries_raw)
        UpcomingAnniversaryList = []
        for obj in upcoming_anniversaries_raw:
            UpcomingAnniversaryList.append({
                "user": obj["user"].first_name + " " + obj["user"].last_name,
                "days_left": obj["days_left"],
                "next_anniversary": obj["next_anniversary"]
            })

        return Response({
            "today_birthdays": TodayBirthdayList,
            "today_anniversaries": get_anniversary_info(request.tenant),
            "upcoming_birthdays": UpcomingBirthdayList,
            "upcoming_anniversaries": UpcomingAnniversaryList,
        })

class UploadHolidayDataAPIView(APIView):
    permission_classes = [IsAdminUser | IsManager]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        from tenants.models import Tenant

        file_obj = request.data.get('file')
        if not file_obj:
            return Response({'error': 'No file provided. Send the Excel file with key "file".'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user

        # Admin can specify any tenant via tenant_id in the request body
        if user.is_superuser or user.is_platform_admin:
            tenant_id = request.data.get('tenant_id')
            if not tenant_id:
                return Response(
                    {'error': 'Admin must provide tenant_id to specify which tenant to upload for.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return Response({'error': f'Tenant with id={tenant_id} not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Manager: use their own tenant
            tenant = user.tenant
            if not tenant:
                return Response({'error': 'No tenant found for your account.'}, status=status.HTTP_400_BAD_REQUEST)

        result = import_holidays_from_excel(file_obj, tenant_id=tenant)

        if result['success']:
            return Response(
                {
                    'message': 'Upload completed',
                    'stats': result['stats']
                },
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': result.get('error', 'Unknown error occurred'), 'stats': result.get('stats', {})},
                status=status.HTTP_400_BAD_REQUEST
            )

class GetHolidayDataAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        with schema_context(request.tenant.schema_name):
            holidays = Holiday.objects.filter(tenant_id=request.tenant.id)
            holiday_list = []
            for holiday in holidays:
                holiday_list.append({
                    "name": holiday.name,
                    "date": holiday.date
                })
        return Response({"holidays": holiday_list}, status=200)
        