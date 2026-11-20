from datetime import timedelta

from django.db.models.signals import post_save
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from rest_framework.test import APIRequestFactory, force_authenticate


class ComplianceAllProjectsTest(TenantTestCase):
    """All Projects = each project's latest sprint combined; list total matches Critical + Warning."""

    def setUp(self):
        from configuration.models import Project, SourceConfiguration
        from data.models import AIInsight, Sprint, WorkItem
        from data.signals import ai_insight_telemetry_signal, work_item_telemetry_signal
        from users.models import User

        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        super().setUp()
        self.user = User.objects.create_user(username='u', email='u@x.test', password='p')
        now = timezone.now()

        def sprint(src, name, end):
            return Sprint.objects.create(external_id=name, source_config_id=src.id, name=name,
                                         start_date=end - timedelta(days=14) if end else None, end_date=end)

        def item(src, spr, n, done=False, failures=(), fixed_later=False):
            WorkItem.objects.create(
                external_id=n, source_config_id=src.id, sprint=spr, title=n, item_type='story',
                status='x', status_category='done' if done else 'todo', created_at=now, updated_at=now,
                dmt_compliant=not failures, compliance_failures=list(failures),
                had_violations=fixed_later, violation_history=[{'failures': ['missing_pr_link']}] if fixed_later else [])

        self.p1 = Project.objects.create(tenant=self.tenant, name='OCS', key='OCS')
        p2 = Project.objects.create(tenant=self.tenant, name='TATVA', key='TATVA')
        s1 = SourceConfiguration.objects.create(project=self.p1, source_type='jira', name='J', base_url='https://j.test')
        s2 = SourceConfiguration.objects.create(project=p2, source_type='jira', name='K', base_url='https://k.test')

        old = sprint(s1, 'P1-old', now - timedelta(days=20))
        p1_latest = sprint(s1, 'P1-new', now - timedelta(days=1))
        sprint(s2, 'P2-undated', None)  # NULL end_date must not win "latest"
        p2_latest = sprint(s2, 'P2-new', now - timedelta(days=3))

        item(s1, old, 'old-bad', done=True, failures=['missing_pr_link'])  # not in any latest sprint
        item(s1, p1_latest, 'a-ok')
        item(s1, p1_latest, 'a-bad', done=True, failures=['missing_pr_link', 'unit_testing_not_done'])
        item(s1, p1_latest, 'a-fixed', fixed_later=True)
        item(s2, p2_latest, 'b-ok')
        item(s2, p2_latest, 'b-bad', failures=['missing_ac_quality'])

    def get(self, view, params=None):
        request = APIRequestFactory().get('/', params or {})
        force_authenticate(request, user=self.user)
        return view.as_view()(request).data

    def test_all_projects_summary_combines_each_projects_latest_sprint(self):
        from data.views import ComplianceSummaryView
        data = self.get(ComplianceSummaryView)
        self.assertEqual((data['total_items'], data['compliant_items']), (5, 3))
        self.assertEqual(data['overall_health'], 60.0)
        self.assertEqual((data['critical_count'], data['warning_count']), (2, 1))

    def test_single_project_without_sprint_uses_its_latest_sprint(self):
        from data.views import ComplianceSummaryView
        data = self.get(ComplianceSummaryView, {'project_id': self.p1.id})
        self.assertEqual((data['total_items'], data['critical_count'], data['warning_count']), (3, 2, 0))

    def test_list_total_matches_critical_plus_warning(self):
        from data.views import ComplianceFlagListView, ComplianceSummaryView
        summary = self.get(ComplianceSummaryView)
        flags = self.get(ComplianceFlagListView, {'page_size': 2})
        self.assertEqual(flags['total_count'], summary['critical_count'] + summary['warning_count'])
        self.assertEqual(flags['fixed_later_count'], 1)
        self.assertEqual(flags['total_pages'], 2)  # 3 active + 1 fixed-later rows still page through

    def test_tester_left_off_code_level_violations_only(self):
        from data.models import WorkItem
        from data.views import ComplianceFlagListView
        from users.models import RoleTable, User

        tester = User.objects.create_user(username='abhijit', email='abhijit@x.test', password='p',
                                          role=RoleTable.objects.create(role_name='QA Engineer'))
        WorkItem.objects.filter(external_id='a-bad').update(
            compliance_failures=['missing_pr_link', 'missing_ac_quality'],
            assignee_contributions=[{'name': 'Dev', 'email': 'dev@x.test'},
                                    {'name': 'Abhijit', 'email': tester.email.upper()}])
        flags = {f['flag_type']: f['assignee_names']
                 for f in self.get(ComplianceFlagListView, {'project_id': self.p1.id})['data'] if not f['fixed_later']}
        self.assertEqual(flags['missing_pr_link'], ['Dev'])
        self.assertEqual(flags['missing_ac_quality'], ['Dev', 'Abhijit'])

    def test_tech_lead_comes_from_org_chart(self):
        from data.models import WorkItem
        from data.views import ComplianceFlagListView
        from users.models import RoleTable, User

        manager = User.objects.create_user(username='boss', email='boss@x.test', password='p', first_name='Boss',
                                           role=RoleTable.objects.create(role_name='Engineering Manager'))
        be_lead = User.objects.create_user(username='belead', email='be@x.test', password='p', first_name='Backend',
                                           last_name='TL', parent=manager,
                                           role=RoleTable.objects.create(role_name='Backend Tech Lead'))
        User.objects.create_user(username='dev', email='dev@x.test', password='p', parent=be_lead,
                                 role=RoleTable.objects.create(role_name='Backend Developer'))
        WorkItem.objects.filter(external_id='a-bad').update(
            assignee_email='dev@x.test', tech_lead_name='Generic Lead', pm_name='PM',
            compliance_failures=['missing_pr_link', 'missing_ac_quality'])
        WorkItem.objects.filter(external_id='b-bad').update(  # nobody in the org chart -> ticket field
            assignee_email='stranger@x.test', tech_lead_name='Generic Lead', compliance_failures=['missing_pr_link'])

        by_item = {(f['work_item_title'], f['flag_type']): f['responsible_name']
                   for f in self.get(ComplianceFlagListView)['data'] if not f['fixed_later']}
        self.assertEqual(by_item[('a-bad', 'missing_pr_link')], 'Backend TL')
        self.assertEqual(by_item[('a-bad', 'missing_ac_quality')], 'PM')
        self.assertEqual(by_item[('b-bad', 'missing_pr_link')], 'Generic Lead')


    def test_work_item_id_does_not_trap_list_on_one_item(self):
        # A notification link keeps work_item_id in the URL; the list must stay the full view.
        from data.models import WorkItem
        from data.views import ComplianceFlagListView
        one = WorkItem.objects.get(external_id='b-bad')
        self.assertEqual(self.get(ComplianceFlagListView, {'work_item_id': one.id})['total_count'],
                         self.get(ComplianceFlagListView)['total_count'])

    def test_fixed_later_api_uses_same_id_as_flags(self):
        from data.models import WorkItem
        from data.views import ComplianceFixedLaterView
        fixed = WorkItem.objects.get(external_id='a-fixed')
        rows = self.get(ComplianceFixedLaterView)
        self.assertEqual([(r['work_item_id'], r['external_id']) for r in rows], [(fixed.id, 'a-fixed')])

    def test_stale_sprint_from_other_project_or_all_projects_is_ignored(self):
        # Bug 10558 / notification links: the URL keeps the old project's sprint_id.
        from data.models import Sprint
        from data.views import ComplianceSummaryView
        p2_sprint = Sprint.objects.get(name='P2-new')
        fresh = self.get(ComplianceSummaryView, {'project_id': self.p1.id})
        stale = self.get(ComplianceSummaryView, {'project_id': self.p1.id, 'sprint_id': p2_sprint.id})
        self.assertEqual(stale, fresh)  # not all zeros
        self.assertEqual(self.get(ComplianceSummaryView, {'sprint_id': p2_sprint.id}),
                         self.get(ComplianceSummaryView))  # All Projects ignores a leftover sprint

class IdentityMergeRelinksUserTest(TenantTestCase):
    """Bug 10570: merging a client email into the real one also moves items off the client-email user."""

    def test_backfill_repoints_resolved_assignee(self):
        self._check_backfill(lambda alias: [{'email': alias}])

    def test_backfill_reads_dict_shaped_mapping(self):
        # Live mappings are stored as {"github_emails": [...]}; this used to crash the backfill.
        self._check_backfill(lambda alias: {'github_emails': ['old@other.test', alias, 'b.presswala@samta.ai']})

    def _check_backfill(self, identities):
        from unittest import mock
        from data.models import UserIdentityMapping, WorkItem
        from data.tasks import backfill_identity_merge
        from users.models import User

        real = User.objects.create_user(username='b1', email='b.presswala@samta.ai', password='p')
        client = User.objects.create_user(username='b2', email='bpresswala@cygnuscompliance.com', password='p')
        now = timezone.now()
        for n, linked in (('w1', client), ('w2', None)):
            WorkItem.objects.create(external_id=n, source_config_id=1, title=n, status='x', status_category='todo',
                                    created_at=now, updated_at=now, assignee_email=client.email, resolved_assignee=linked)
        mapping = UserIdentityMapping.objects.create(canonical_email=real.email, canonical_name='Burhanuddin',
                                                     source_identities=identities(client.email))
        from users.models import ExternalIdentity
        clickup = ExternalIdentity.objects.create(user=client, provider='clickup', external_id='89244146')
        with mock.patch('data.tasks.update_all_sprint_metrics.delay'):
            backfill_identity_merge(mapping.id, schema_name=self.tenant.schema_name)
        self.assertEqual(set(WorkItem.objects.values_list('assignee_email', 'resolved_assignee')),
                         {(real.email, real.id)})
        clickup.refresh_from_db()
        self.assertEqual(clickup.user, real)  # workload co-assignees + later syncs use the real user
