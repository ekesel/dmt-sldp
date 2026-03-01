import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django_tenants.utils import schema_context
from rest_framework.test import APIRequestFactory, force_authenticate
from data.leaderboard_views import LeaderboardView
from django.contrib.auth import get_user_model

User = get_user_model()

with schema_context('acme_corp'):
    user = User.objects.get(username='manager')
    factory = APIRequestFactory()
    request = factory.get('/api/dashboard/leaderboard/')
    force_authenticate(request, user=user)
    
    view = LeaderboardView.as_view()
    response = view(request)
    
    velocity_winners = response.data.get('velocity', [])
    for w in velocity_winners:
        print(f"Winner: {w.get('name')}")
        print(f"Has history: {'history' in w}")
        if 'history' in w:
            print(f"History length: {len(w['history'])}")
            print(f"History data: {w['history']}")
        print(f"Reason: {w.get('reason')}")
        print(f"Avatar: {w.get('avatar')}")
        print("-------")
