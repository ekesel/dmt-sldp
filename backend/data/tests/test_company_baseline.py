from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from users.models import User
from rest_framework.test import APIRequestFactory, force_authenticate
from data.company_baseline_views import CompanyBaselineView
from configuration.models import CompanyBaseline

class CompanyBaselineViewTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='password123')
        self.factory = APIRequestFactory()

    def test_get_company_baseline_creates_default(self):
        # When database is empty, GET should return default baseline
        with schema_context('public'):
            self.assertEqual(CompanyBaseline.objects.count(), 0)
        
        request = self.factory.get('/api/admin/company-baseline/')
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        response = CompanyBaselineView.as_view()(request)
        
        self.assertEqual(response.status_code, 200)
        res_data = response.data
        self.assertEqual(res_data['status_code'], 200)
        self.assertEqual(res_data['message'], "success")
        
        data = res_data['data']
        self.assertEqual(data['kpis']['velocity'], 400.0)
        self.assertEqual(data['kpis']['item_volume']['total'], 20)
        self.assertEqual(data['kpis']['item_volume']['completed'], 16)
        
        # Verify it was saved to DB
        with schema_context('public'):
            self.assertEqual(CompanyBaseline.objects.count(), 1)
            db_baseline = CompanyBaseline.objects.first()
            self.assertIsNotNone(db_baseline)

    def test_post_company_baseline_updates_value(self):
        # Create initial baseline
        with schema_context('public'):
            baseline = CompanyBaseline.objects.create(velocity=350.0)
        
        update_data = {
            "kpis": {
                "velocity": 450.0,
                "compliance_rate": 85.0,
                "item_volume": {
                    "total": 30,
                    "completed": 25
                }
            }
        }
        
        request = self.factory.post('/api/admin/company-baseline/', update_data, format='json')
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        response = CompanyBaselineView.as_view()(request)
        
        self.assertEqual(response.status_code, 200)
        
        # Verify db updated
        with schema_context('public'):
            baseline.refresh_from_db()
            self.assertEqual(baseline.velocity, 450.0)
            self.assertEqual(baseline.compliance_rate, 85.0)
            self.assertEqual(baseline.item_volume_total, 30)
            self.assertEqual(baseline.item_volume_completed, 25)


