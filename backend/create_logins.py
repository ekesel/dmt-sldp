import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from tenants.models import Tenant
from django_tenants.utils import schema_context

User = get_user_model()

def create_or_update_user(email, username, password, **kwargs):
    user, created = User.objects.get_or_create(username=username, defaults={'email': email})
    user.set_password(password)
    user.is_active = True
    for key, value in kwargs.items():
        setattr(user, key, value)
    user.save()
    return user

# 1. Super Admin (Public Schema)
with schema_context('public'):
    su = create_or_update_user('superadmin@test.com', 'superadmin', 'Pass123!', 
                               is_superuser=True, is_staff=True, is_platform_admin=True)
    admin = create_or_update_user('admin@test.com', 'platformadmin', 'Pass123!', 
                                  is_superuser=False, is_staff=True, is_platform_admin=True)
    print("Super Admin: superadmin@test.com / Pass123!")
    print("Admin: admin@test.com / Pass123!")

# 2. Company Manager & User (acme_corp Schema)
try:
    tenant = Tenant.objects.get(schema_name='acme_corp')
    with schema_context('acme_corp'):
        manager = create_or_update_user('manager@acme.com', 'manager', 'Pass123!', 
                                        is_manager=True, is_staff=True, tenant=tenant)
        user = create_or_update_user('user@acme.com', 'companyuser', 'Pass123!', 
                                     is_manager=False, is_staff=False, tenant=tenant)
        print("Manager: manager@acme.com / Pass123!")
        print("User: user@acme.com / Pass123!")
except Exception as e:
    print(f"Error creating company users: {e}")
