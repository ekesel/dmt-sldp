import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django_tenants.utils import schema_context
from data.models import DeveloperMetrics
from django.db.models import Sum

with schema_context('acme_corp'):
    velocity_winners = DeveloperMetrics.objects.values('developer_email', 'developer_name').annotate(
        score=Sum('story_points_completed')
    ).order_by('-score')[:3]
    
    print("Velocity winners:")
    for w in velocity_winners:
        email = w['developer_email']
        history_qs = DeveloperMetrics.objects.filter(developer_email=email).order_by('-sprint_end_date')[:5]
        history = [
            {"date": str(h.sprint_end_date), "score": round(getattr(h, 'story_points_completed') or 0, 1)}
            for h in history_qs
        ][::-1]
        print(f"Email: {email}, History array length: {len(history)}, History: {history}")
