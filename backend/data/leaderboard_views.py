from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg, Max, Count
from .models import DeveloperMetrics, WorkItem
from users.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        
        # 1. Highest Compliance (Quality Champion)
        # We look for developers with at least some items completed
        quality_winners = DeveloperMetrics.objects.filter(items_completed__gt=0)
        if project_id:
            quality_winners = quality_winners.filter(project_id=project_id)
        
        quality_winners = quality_winners.values('developer_email', 'developer_name').annotate(
            score=Avg('dmt_compliance_rate'),
            coverage=Avg('coverage_avg_percent')
        ).order_by('-score', '-coverage')[:3]

        # 2. Most Points (Velocity King)
        velocity_winners = DeveloperMetrics.objects.all()
        if project_id:
            velocity_winners = velocity_winners.filter(project_id=project_id)
            
        velocity_winners = velocity_winners.values('developer_email', 'developer_name').annotate(
            score=Sum('story_points_completed')
        ).order_by('-score')[:3]

        # 3. Top Reviewer
        reviewer_winners = DeveloperMetrics.objects.all()
        if project_id:
            reviewer_winners = reviewer_winners.filter(project_id=project_id)
            
        reviewer_winners = reviewer_winners.values('developer_email', 'developer_name').annotate(
            score=Sum('prs_reviewed')
        ).order_by('-score')[:3]

        # 4. AI Specialist
        ai_winners = DeveloperMetrics.objects.all()
        if project_id:
            ai_winners = ai_winners.filter(project_id=project_id)
            
        ai_winners = ai_winners.values('developer_email', 'developer_name').annotate(
            score=Avg('ai_usage_percent')
        ).order_by('-score')[:3]

        # Map to final format with user details (custom title, avatar)
        def map_winner(w, category):
            email = w['developer_email']
            user = User.objects.filter(email__iexact=email).first()
            
            # If user exists, we can get their custom title and avatar
            if user:
                ser = UserSerializer(user, context={'request': request})
                name = user.get_full_name() or user.username
                title = user.custom_title or category
                avatar = ser.data.get('avatar_url')
            else:
                name = w['developer_name'] or email
                title = category
                # Fallback gravatar for non-portal users (if any)
                import hashlib
                email_hash = hashlib.md5(email.lower().encode('utf-8')).hexdigest()
                avatar = f"https://www.gravatar.com/avatar/{email_hash}?d=identicon"

            return {
                "name": name,
                "email": email,
                "title": title,
                "avatar": avatar,
                "score": round(w['score'], 1) if w['score'] else 0
            }

        return Response({
            "quality": [map_winner(w, "Code Quality Champion") for w in quality_winners],
            "velocity": [map_winner(w, "Velocity King") for w in velocity_winners],
            "reviewer": [map_winner(w, "Top Reviewer") for w in reviewer_winners],
            "ai": [map_winner(w, "AI Specialist") for w in ai_winners],
        })
