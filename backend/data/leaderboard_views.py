from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg, Max, Count
from .models import DeveloperMetrics, WorkItem
from users.serializers import UserSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_winners_from_qs(self, base_qs, project_id, request):
        if project_id:
            base_qs = base_qs.filter(project_id=project_id)
            
        # 1. Highest Compliance
        quality_winners = base_qs.filter(items_completed__gt=0).values('developer_email', 'developer_name').annotate(
            score=Avg('dmt_compliance_rate'),
            coverage=Avg('coverage_avg_percent')
        ).order_by('-score', '-coverage')[:3]

        # 2. Most Points
        velocity_winners = base_qs.values('developer_email', 'developer_name').annotate(
            score=Sum('story_points_completed')
        ).order_by('-score')[:3]

        # 3. Top Reviewer
        reviewer_winners = base_qs.values('developer_email', 'developer_name').annotate(
            score=Sum('prs_reviewed')
        ).order_by('-score')[:3]

        # 4. AI Specialist
        ai_winners = base_qs.values('developer_email', 'developer_name').annotate(
            score=Avg('ai_usage_percent')
        ).order_by('-score')[:3]

        def map_winner(w, category, metric_name, field_name):
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
                name = w['developer_name'] or email
                title = category
                import hashlib
                email_hash = hashlib.md5(email.lower().encode('utf-8')).hexdigest()
                avatar = f"https://www.gravatar.com/avatar/{email_hash}?d=identicon"
                reason = f"Top performer in {metric_name}."

            history_qs = DeveloperMetrics.objects.filter(developer_email=email)
            if project_id:
                history_qs = history_qs.filter(project_id=project_id)
            
            if field_name in ['dmt_compliance_rate', 'coverage_avg_percent', 'ai_usage_percent']:
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
                "score": round(w['score'], 1) if w['score'] else 0,
                "reason": reason,
                "history": history
            }

        return {
            "quality": [map_winner(w, "Code Quality Champion", "Code Compliance", "dmt_compliance_rate") for w in quality_winners],
            "velocity": [map_winner(w, "Velocity King", "Sprint Velocity", "story_points_completed") for w in velocity_winners],
            "reviewer": [map_winner(w, "Top Reviewer", "PR Reviews", "prs_reviewed") for w in reviewer_winners],
            "ai": [map_winner(w, "AI Specialist", "AI Usage", "ai_usage_percent") for w in ai_winners],
        }

    def get(self, request):
        project_id = request.query_params.get('project_id')
        
        now = timezone.now()
        current_month = now.month
        current_year = now.year
        
        if current_month == 1:
            prev_month = 12
            prev_year = current_year - 1
        else:
            prev_month = current_month - 1
            prev_year = current_year

        # Current Month Data
        current_qs = DeveloperMetrics.objects.filter(
            sprint_end_date__year=current_year,
            sprint_end_date__month=current_month
        )
        current_data = self._get_winners_from_qs(current_qs, project_id, request)

        # Past Month Data
        past_qs = DeveloperMetrics.objects.filter(
            sprint_end_date__year=prev_year,
            sprint_end_date__month=prev_month
        )
        past_data = self._get_winners_from_qs(past_qs, project_id, request)

        return Response({
            "current_month": current_data,
            "past_month": past_data
        })
