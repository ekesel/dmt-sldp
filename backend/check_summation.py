import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django_tenants.utils import schema_context
from data.models import DeveloperMetrics
from django.db.models import Sum

with schema_context('acme_corp'):
    email = 'ekaansh.sahni@samta.ai'
    
    # 1. Total All Time (Same as Leaderboard Winner Score)
    total_score = DeveloperMetrics.objects.filter(developer_email=email).aggregate(
        score=Sum('story_points_completed')
    )['score']
    
    # 2. History per sprint
    sprint_scores = DeveloperMetrics.objects.filter(developer_email=email).values('sprint_end_date').annotate(
        score=Sum('story_points_completed')
    ).order_by('-sprint_end_date')
    
    history_arr = [(str(x['sprint_end_date']), round(x['score'], 1)) for x in sprint_scores]
    history_sum = sum(x[1] for x in history_arr)
    
    print(f"User: {email}")
    print(f"Total Score on Leaderboard: {total_score}")
    print(f"Number of sprints tracked: {len(history_arr)}")
    print(f"Sum of ALL sprints: {history_sum}")
    print(f"Sum of LAST 5 sprints (Graph only shows this!): {sum(x[1] for x in history_arr[:5])}")
    print("Top 5 Sprints Array:")
    for h in history_arr[:5]:
        print(h)
