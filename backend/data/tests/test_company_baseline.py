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



    def test_workload_settings_only_superadmin(self):
        payload = {"workload_settings": {"per_sprint_limits": {"under": 2, "over": 5}}}

        request = self.factory.post('/api/admin/company-baseline/', payload, format='json')
        force_authenticate(request, user=self.user)
        self.assertEqual(CompanyBaselineView.as_view()(request).status_code, 403)

        admin = User.objects.create_superuser(username='root', email='root@example.com', password='password123')
        request = self.factory.post('/api/admin/company-baseline/', payload, format='json')
        force_authenticate(request, user=admin)
        response = CompanyBaselineView.as_view()(request)
        self.assertIn(response.status_code, (200, 201))
        self.assertEqual(response.data['data']['workload_settings']['per_sprint_limits'], {'under': 2, 'over': 5})

    def test_workload_settings_effective_from(self):
        admin = User.objects.create_superuser(username='root', email='root@example.com', password='password123')

        def post(payload):
            request = self.factory.post('/api/admin/company-baseline/', payload, format='json')
            force_authenticate(request, user=admin)
            return CompanyBaselineView.as_view()(request)

        post({"workload_settings": {"per_sprint_limits": {"over": 5}}, "workload_settings_effective_from": "2026-01-01"})
        # Future version: today still uses the January one; partial update keeps over=5.
        response = post({"workload_settings": {"per_sprint_limits": {"under": 2}},
                         "workload_settings_effective_from": "2999-01-01"})
        data = response.data['data']
        self.assertEqual(data['workload_settings']['per_sprint_limits'], {'under': 3, 'over': 5})
        history = {str(v['effective_from']): v['settings']['per_sprint_limits'] for v in data['workload_settings_history']}
        self.assertEqual(history, {'2026-01-01': {'under': 3, 'over': 5}, '2999-01-01': {'under': 2, 'over': 5}})

        request = self.factory.delete('/api/admin/company-baseline/?workload_settings_effective_from=2999-01-01')
        force_authenticate(request, user=admin)
        self.assertEqual(len(CompanyBaselineView.as_view()(request).data['data']['workload_settings_history']), 1)

    def test_save_between_versions_keeps_later_ones(self):
        admin = User.objects.create_superuser(username='root', email='root@example.com', password='password123')

        def post(over, day):
            request = self.factory.post('/api/admin/company-baseline/', {
                "workload_settings": {"per_sprint_limits": {"over": over}}, "workload_settings_effective_from": day,
            }, format='json')
            force_authenticate(request, user=admin)
            return CompanyBaselineView.as_view()(request).data['data']['workload_settings_history']

        post(4, "2026-07-01")
        post(5, "2026-08-01")
        post(6, "2026-10-01")
        # Saving from 1 Sep slots in between: August now ends 31 Aug, the 1 Oct version stays.
        history = post(7, "2026-09-01")
        self.assertEqual([(str(v['effective_from']), str(v['effective_to']), v['settings']['per_sprint_limits']['over'])
                          for v in history],
                         [('2026-07-01', '2026-07-31', 4), ('2026-08-01', '2026-08-31', 5),
                          ('2026-09-01', '2026-09-30', 7), ('2026-10-01', 'None', 6)])
        self.assertEqual(history[0]['created_by'], 'root@example.com')
        self.assertIsNotNone(history[0]['created_at'])

    def test_sprint_window_must_be_whole_number(self):
        admin = User.objects.create_superuser(username='root', email='root@example.com', password='password123')
        request = self.factory.post('/api/admin/company-baseline/', {"workload_settings": {"sprint_window": 2.5}}, format='json')
        force_authenticate(request, user=admin)
        self.assertEqual(CompanyBaselineView.as_view()(request).status_code, 400)

    def test_unchanged_settings_save_is_a_no_op(self):
        admin = User.objects.create_superuser(username='root', email='root@example.com', password='password123')

        def post(payload):
            request = self.factory.post('/api/admin/company-baseline/', payload, format='json')
            force_authenticate(request, user=admin)
            return CompanyBaselineView.as_view()(request).data['data']

        post({"workload_settings": {"per_sprint_limits": {"over": 5}}, "workload_settings_effective_from": "2026-01-01"})
        post({"workload_settings": {"per_sprint_limits": {"over": 8}}, "workload_settings_effective_from": "2999-01-01"})
        # KPI save sending today's settings back (dated today): no new version, the future one stays.
        data = post({"kpis": {"velocity": 30}, "workload_settings": data_limits(5)})
        self.assertEqual([str(v['effective_from']) for v in data['workload_settings_history']], ['2026-01-01', '2999-01-01'])
        self.assertEqual(str(data['workload_settings_effective_from']), '2026-01-01')
        # Min 3 / Max 5: Mid 3-5, Junior 0.7 -> 2.1 / 3.5 -> 3-3, Senior 1.3 -> 3.9 / 6.5 -> 4-6.
        self.assertEqual(data['workload_ranges'], {'junior': {'min': 3, 'max': 3}, 'mid': {'min': 3, 'max': 5},
                                                   'senior': {'min': 4, 'max': 6}})
        self.assertEqual(data['workload_settings_history'][1]['ranges']['mid'], {'min': 3, 'max': 8})
        # Same values on another date still start a version (Jan - Feb, Mar - ...).
        data = post({"workload_settings": data_limits(5), "workload_settings_effective_from": "2026-03-01"})
        self.assertEqual([(str(v['effective_from']), str(v['effective_to'])) for v in data['workload_settings_history']],
                         [('2026-01-01', '2026-02-28'), ('2026-03-01', '2998-12-31'), ('2999-01-01', 'None')])


def data_limits(over):
    return {"per_sprint_limits": {"under": 3, "over": over}}

