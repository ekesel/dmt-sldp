from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from tenants.models import Tenant, Domain

User = get_user_model()

class TenantAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin', 
            password='password', 
            email='admin@example.com',
            is_platform_admin=True
        )
        self.regular_user = User.objects.create_user(
            username='user', 
            password='password', 
            email='user@example.com',
            is_platform_admin=False
        )

    def test_tenant_creation_requires_platform_admin(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post('/api/admin/tenants/', {'name': 'New Tenant', 'slug': 'new-tenant'})
        self.assertEqual(response.status_code, 403)

    def test_tenant_creation_success(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/admin/tenants/', {'name': 'New Tenant', 'slug': 'new-tenant'})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Tenant.objects.filter(slug='new-tenant').exists())
        self.assertTrue(Domain.objects.filter(tenant__slug='new-tenant').exists())

    def test_tenant_list_access(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/tenants/')
        self.assertEqual(response.status_code, 200)

    def test_tenant_delete(self):
        tenant = Tenant.objects.create(name='Delete Me', slug='delete-me', schema_name='delete_me')
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/admin/tenants/{tenant.id}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Tenant.objects.filter(slug='delete-me').exists())
