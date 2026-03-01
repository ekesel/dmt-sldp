import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django_tenants.utils import schema_context
from users.models import User

with schema_context('acme_corp'):
    ekaansh = User.objects.filter(email__icontains='ekaansh').first()
    if ekaansh:
        print(f"Ekaansh found: {ekaansh.email}")
        print(f"Has profile picture attached: {bool(ekaansh.profile_picture)}")
        if ekaansh.profile_picture:
            print(f"Profile picture url: {ekaansh.profile_picture.url}")
        print(f"Avatar URL property (if it exists): {getattr(ekaansh, 'avatar_url', 'None')}")
    else:
        print("Ekaansh not found in acme_corp!")
        
    shubham = User.objects.filter(email__icontains='shubham').first()
    if shubham:
        print(f"Shubham found: {shubham.email}")
        print(f"Has profile picture attached: {bool(shubham.profile_picture)}")
    else:
        print("Shubham not found in acme_corp!")
