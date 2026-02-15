from django.core.management.base import BaseCommand
from tenants.models import Tenant, Domain
from users.models import User
import os

class Command(BaseCommand):
    help = 'Initializes the public tenant and admin user'

    def handle(self, *args, **options):
        # 1. Create Public Tenant
        if not Tenant.objects.filter(schema_name='public').exists():
            tenant = Tenant.objects.create(
                schema_name='public',
                name='Public Tenant',
                slug='public'
            )
            # Add domain
            Domain.objects.create(
                domain=os.environ.get('DOMAIN', 'localhost'),
                tenant=tenant,
                is_primary=True
            )
            self.stdout.write(self.style.SUCCESS('Successfully created Public Tenant'))
        else:
            self.stdout.write('Public Tenant already exists')

        # 2. Create Admin User
        admin_username = 'admin'
        admin_password = 'kt6uqn0kss'
        
        if not User.objects.filter(username=admin_username).exists():
            user = User.objects.create_superuser(
                username=admin_username,
                email='admin@dmt.com',
                password=admin_password
            )
            user.is_platform_admin = True # Ensure platform admin flag is set!
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully created admin user: {admin_username}'))
        else:
            self.stdout.write('Admin user already exists')
