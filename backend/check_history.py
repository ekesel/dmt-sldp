import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django_tenants.utils import schema_context
from data.models import DeveloperMetrics

with schema_context('acme_corp'):
    metrics = list(DeveloperMetrics.objects.values('developer_email', 'sprint_end_date', 'project_id', 'items_completed').order_by('-sprint_end_date')[:5])
    print("Metrics in DB:", metrics)

    history_qs = DeveloperMetrics.objects.filter(developer_email='ekaansh188@gmail.com').order_by('-sprint_end_date')[:5]
    print("History for ekaansh:", list(history_qs.values('sprint_end_date', 'story_points_completed')))
