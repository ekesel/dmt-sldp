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
from homepage.utils import get_birthday_info, get_anniversary_info, upcoming_birthday_info, upcoming_anniversary_info  

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


# star Profomer -
class StarPerformerAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_winner(self, queryset, category, metric_name, field_name, agg, project_id, request):
        """
        Convert queryset first result into formatted response
        """
        w = queryset.first()

        if not w:
            return None

        email = w['developer_email']
        user = User.objects.filter(email__iexact=email).first()

        if user:
            ser = UserSerializer(user, context={'request': request})
            name = user.get_full_name() or user.username
            title = user.custom_title or category

            if user.profile_picture:
                avatar = request.build_absolute_uri(user.profile_picture.url)
            else:
                avatar = ser.data.get('avatar_url')

            full_reason = getattr(user, 'competitive_title_reason', None)
            reason = full_reason if full_reason and user.competitive_title == category else f"Top performer in {metric_name}."
        else:
            import hashlib
            name = w['developer_name'] or email
            title = category
            email_hash = hashlib.md5(email.lower().encode('utf-8')).hexdigest()
            avatar = f"https://www.gravatar.com/avatar/{email_hash}?d=identicon"
            reason = f"Top performer in {metric_name}."

        history_qs = DeveloperMetrics.objects.filter(developer_email=email)
        if project_id:
            history_qs = history_qs.filter(project_id=project_id)

        if agg == 'avg':
            history_qs = history_qs.values('sprint_end_date').annotate(
                aggregated_score=Avg(field_name)
            ).order_by('-sprint_end_date')[:5]
        else:
            history_qs = history_qs.values('sprint_end_date').annotate(
                aggregated_score=Sum(field_name)
            ).order_by('-sprint_end_date')[:5]

        history = [
            {"date": str(h['sprint_end_date']), "score": round(h['aggregated_score'] or 0, 1)}
            for h in history_qs
        ][::-1]

        return {
            "name": name,
            "email": email,
            "title": title,
            "avatar": avatar,
            "score": round(w['score'], 1) if w['score'] is not None else 0,
            "reason": reason,
            "history": history
        }

    def _get_winners_from_qs(self, base_qs, project_id, request):
        if project_id:
            base_qs = base_qs.filter(project_id=project_id)

        # 1. Highest Compliance
        quality_qs = (
            base_qs.filter(items_completed__gt=0)
            .values('developer_email', 'developer_name')
            .annotate(
                score=Avg('dmt_compliance_rate'),
                coverage=Avg('coverage_avg_percent')
            )
            .order_by('-score', '-coverage')
        )

        # 2. Most Points
        velocity_qs = (
            base_qs.values('developer_email', 'developer_name')
            .annotate(
                score=Sum('story_points_completed')
            )
            .order_by('-score')
        )

        # 3. Top Reviewer
        reviewer_qs = (
            base_qs.values('developer_email', 'developer_name')
            .annotate(
                score=Sum('prs_reviewed')
            )
            .order_by('-score')
        )

        # 4. AI Specialist
        ai_qs = (
            base_qs.values('developer_email', 'developer_name')
            .annotate(
                score=Avg('ai_usage_percent')
            )
            .order_by('-score')
        )

        # 5. Highest Objective (PR-Analyzed) AI Usage
        objective_ai_qs = (
            base_qs.filter(code_ai_usage_percent__gt=0)
            .values('developer_email', 'developer_name')
            .annotate(
                score=Avg('code_ai_usage_percent')
            )
            .order_by('-score')
        )

        # 6. Most Items Completed (Throughput)
        throughput_qs = (
            base_qs.values('developer_email', 'developer_name')
            .annotate(
                score=Sum('items_completed')
            )
            .order_by('-score')
        )

        # 7. Highest Code Coverage
        coverage_qs = (
            base_qs.filter(coverage_avg_percent__isnull=False)
            .values('developer_email', 'developer_name')
            .annotate(
                score=Avg('coverage_avg_percent')
            )
            .order_by('-score')
        )

        # 8. Fewest Defects Attributed (Clean Coder) — must have completed work
        clean_coder_qs = (
            base_qs.filter(items_completed__gt=0)
            .values('developer_email', 'developer_name')
            .annotate(
                score=Sum('defects_attributed')
            )
            .order_by('score')  # ascending: fewer defects = better
        )

        return {
            "quality": self._get_winner(quality_qs, "Code Quality Champion", "DMT Compliance", "dmt_compliance_rate", "avg", project_id, request),
            "velocity": self._get_winner(velocity_qs, "Velocity King", "Sprint Velocity", "story_points_completed", "sum", project_id, request),
            "reviewer": self._get_winner(reviewer_qs, "Top Reviewer", "PR Reviews", "prs_reviewed", "sum", project_id, request),
            "ai": self._get_winner(ai_qs, "AI Specialist", "AI Usage", "ai_usage_percent", "avg", project_id, request),
            "objective_ai": self._get_winner(objective_ai_qs, "Objective AI Master", "Objective AI Code", "code_ai_usage_percent", "avg", project_id, request),
            "throughput": self._get_winner(throughput_qs, "Throughput Champion", "Items Completed", "items_completed", "sum", project_id, request),
            "coverage": self._get_winner(coverage_qs, "Coverage Champion", "Code Coverage", "coverage_avg_percent", "avg", project_id, request),
            "clean_coder": self._get_winner(clean_coder_qs, "Clean Coder", "Defect-Free Work", "defects_attributed", "sum", project_id, request),
        }

    def get(self, request):
        project_id = request.query_params.get('project_id')

        now = timezone.now()
        current_month = now.month
        current_year = now.year

        current_qs = DeveloperMetrics.objects.filter(
            sprint_end_date__year=current_year,
            sprint_end_date__month=current_month
        )
        current_data = self._get_winners_from_qs(current_qs, project_id, request)

        return Response({
            "message": "Current month top performers",
            "top_performers": current_data
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
