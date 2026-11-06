from datetime import date

from django.db.models.signals import post_save
from django.test import SimpleTestCase
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from data.analytics.workload import (
    DEFAULT_SETTINGS, classify_workload as classify_team, member_capacity, merge_settings,
)

START = date(2000, 1, 1)


def classify_workload(counts, levels, sprint_count, settings, allocation=None):
    """Same level, settings and allocation in every sprint."""
    days = [date(2026, 9, 1)] * max(sprint_count, 1)
    capacity = member_capacity(
        [k for k, c in counts.items() if c > 0], days, [(START, settings)],
        {k: [(START, lvl)] for k, lvl in levels.items()},
        None if allocation is None else [((2000, 1), allocation)],
    )
    return classify_team(counts, capacity, sprint_count, settings)

# Sample OCS team from the Workload Calculation proposal.
OCS_5_SPRINTS = {'ekansh': 33, 'niharika': 28, 'pradhuman': 27, 'pratyush': 25,
                 'shashi': 25, 'sakshi': 20, 'arun': 15, 'abhijit': 12}
OCS_SPRINT_5 = {'ekansh': 7, 'niharika': 6, 'pradhuman': 5, 'pratyush': 5,
                'shashi': 5, 'sakshi': 4, 'arun': 3, 'abhijit': 2}
# The original percentile proposal, kept behind use_percentile.
PCT = merge_settings({'use_percentile': True})


def statuses(result):
    return {k: v['status'] for k, v in result.items()}


class CapacityWorkloadTests(SimpleTestCase):
    """Default: status from each person's ideal range (Workload Calculation Formula approach note)."""

    def test_approach_note_example(self):
        counts = {'affan': 2, 'niharika': 6, 'pradhuman': 6, 'ekansh': 9, 'arun': 4, 'sakshi': 4, 'shashi': 3}
        levels = {'affan': 'junior', 'niharika': 'junior', 'ekansh': 'senior', 'arun': 'senior', 'shashi': 'senior'}
        alloc = {'affan': 0.3, 'pradhuman': 0.8, 'arun': 0.5}
        r = classify_workload(counts, levels, 1, DEFAULT_SETTINGS, alloc)
        self.assertEqual(statuses(r), {
            'affan': 'Overloaded', 'niharika': 'Overloaded', 'pradhuman': 'Overloaded', 'ekansh': 'Overloaded',
            'arun': 'Overloaded', 'sakshi': 'Balanced', 'shashi': 'Underutilised',
        })
        ranges = {k: (v['ideal_min'], v['ideal_max']) for k, v in r.items()}
        self.assertEqual(ranges, {
            'affan': (1, 1), 'niharika': (3, 4), 'pradhuman': (3, 4), 'ekansh': (4, 7),
            'arun': (2, 3), 'sakshi': (3, 5), 'shashi': (4, 7),
        })
        self.assertEqual(r['affan']['capacity'], 0.21)

    def test_team_card_scales_by_sprints(self):
        r = classify_workload({'a': 29, 'b': 30, 'c': 14}, {}, 5, DEFAULT_SETTINGS)
        self.assertEqual((r['a']['ideal_min'], r['a']['ideal_max']), (15, 29))
        self.assertEqual(statuses(r), {'a': 'Balanced', 'b': 'Overloaded', 'c': 'Underutilised'})

    def test_allocation_floor_and_missing(self):
        r = classify_workload({'tiny': 1, 'none': 4}, {}, 1, DEFAULT_SETTINGS, {'tiny': 0.02})
        self.assertEqual(r['tiny']['capacity'], 0.1)  # floored at min_allocation 10%
        self.assertEqual((r['tiny']['ideal_min'], r['tiny']['ideal_max']), (1, 1))  # range never empty
        self.assertEqual(r['tiny']['status'], 'Balanced')
        self.assertEqual(r['none']['capacity'], 1.0)  # no allocation row = 100%

    def test_zero_item_members_are_ignored(self):
        r = classify_workload({'a': 0, 'b': 10, 'c': 10, 'd': 10}, {}, 1, DEFAULT_SETTINGS)
        self.assertNotIn('a', r)
        self.assertEqual(r['b']['percentile'], 50.0)

    def test_settings_override(self):
        cfg = merge_settings({'per_sprint_limits': {'over': 5}})
        self.assertEqual(cfg['per_sprint_limits'], {'under': 3, 'over': 5})
        r = classify_workload({'a': 5, 'b': 4}, {}, 1, cfg)
        self.assertEqual(statuses(r), {'a': 'Overloaded', 'b': 'Balanced'})


class PercentileGateTests(SimpleTestCase):
    """use_percentile on: the original proposal's results."""

    def test_team_card_matches_proposal(self):
        r = classify_workload(OCS_5_SPRINTS, {}, 5, PCT)
        self.assertEqual(r['ekansh']['percentile'], 93.75)
        self.assertEqual(r['pratyush']['percentile'], 50.0)
        self.assertEqual(r['abhijit']['percentile'], 6.25)
        expected = {k: 'Balanced' for k in OCS_5_SPRINTS}
        expected.update(ekansh='Overloaded', abhijit='Underutilised')
        self.assertEqual(statuses(r), expected)

    def test_one_outlier_does_not_shift_others(self):
        r = classify_workload({**OCS_5_SPRINTS, 'ekansh': 60}, {}, 5, PCT)
        self.assertEqual(r['niharika']['status'], 'Balanced')
        self.assertEqual(r['niharika']['percentile'], 81.25)

    def test_individual_current_sprint(self):
        r = classify_workload(OCS_SPRINT_5, {}, 1, PCT)
        self.assertEqual(r['pradhuman']['percentile'], 56.25)
        expected = {k: 'Balanced' for k in OCS_SPRINT_5}
        expected.update(ekansh='Overloaded', niharika='Overloaded', abhijit='Underutilised')
        self.assertEqual(statuses(r), expected)

    def test_small_team_uses_fixed_limits(self):
        r = classify_workload({'a': 4, 'b': 32}, {}, 5, PCT)
        self.assertEqual(statuses(r), {'a': 'Underutilised', 'b': 'Overloaded'})

    def test_seniority_weight(self):
        # Junior 28 items -> 40 effective: top of team and over the junior range.
        # Senior 18 items -> ~13.8 effective: bottom of team and under the senior range.
        counts = {**OCS_5_SPRINTS, 'niharika': 28, 'sakshi': 18}
        r = classify_workload(counts, {'niharika': 'junior', 'sakshi': 'senior'}, 5, PCT)
        self.assertEqual(r['niharika']['status'], 'Overloaded')
        self.assertEqual(r['sakshi']['status'], 'Underutilised')



class TeamWorkloadAllocationTest(TenantTestCase):
    """AssigneeDistributionView end to end: level x published allocation drives each member's range."""

    def setUp(self):
        from data.models import AIInsight, Sprint, WorkItem
        from data.signals import ai_insight_telemetry_signal, work_item_telemetry_signal
        from configuration.models import Project, SourceConfiguration
        from users.models import ResourceAllocation, User, UserLevelHistory

        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        super().setUp()
        now = timezone.now()
        self.viewer = User.objects.create_user(username='viewer', email='viewer@x.test', password='p')
        self.project = Project.objects.create(tenant=self.tenant, name='OCS', key='OCS')
        src = SourceConfiguration.objects.create(project=self.project, source_type='jira', name='J', base_url='https://j.test')
        sprint = Sprint.objects.create(external_id='s1', source_config_id=src.id, name='S1',
                                       start_date=now - timezone.timedelta(days=3), end_date=now + timezone.timedelta(days=11))
        # (email, level, allocation %, items)
        people = [('affan@x.test', 'junior', 30, 2), ('shashi@x.test', 'senior', 100, 3), ('sakshi@x.test', 'mid', 100, 4)]
        n = 0
        for email, level, pct, items in people:
            user = User.objects.create_user(username=email, email=email, password='p', seniority=level)
            UserLevelHistory.objects.create(user=user, seniority=level, effective_from=START)
            ResourceAllocation.objects.create(developer=user, project=self.project, month=now.month, year=now.year,
                                              percentage_allocated=pct, status='PUBLISHED')
            for _ in range(items):
                n += 1
                WorkItem.objects.create(external_id=f'w{n}', source_config_id=src.id, sprint=sprint, title='t',
                                        status='todo', status_category='todo', created_at=now, updated_at=now,
                                        assignee_email=email)
        # Not allocated to the project: hidden from the project's team card.
        WorkItem.objects.create(external_id='x', source_config_id=src.id, sprint=sprint, title='t', status='todo',
                                status_category='todo', created_at=now, updated_at=now, assignee_email='guest@x.test')

    def test_status_and_range_per_member(self):
        from data.views import AssigneeDistributionView

        request = APIRequestFactory().get('/api/dashboard/assignee-distribution/', {'project_id': str(self.project.id)})
        force_authenticate(request, user=self.viewer)
        rows = {r['email']: r for r in AssigneeDistributionView.as_view()(request).data}
        self.assertNotIn('guest@x.test', rows)
        got = {e: (r['capacity'], r['ideal_min'], r['ideal_max'], r['workload_status']) for e, r in rows.items()}
        self.assertEqual(got, {
            'affan@x.test': (0.21, 1, 1, 'Overloaded'),
            'shashi@x.test': (1.3, 4, 7, 'Underutilised'),
            'sakshi@x.test': (1.0, 3, 5, 'Balanced'),
        })


class EffectiveDatedCapacityTests(SimpleTestCase):
    """Each sprint uses the level, settings and allocation in effect on its day."""

    def test_promotion_counts_only_from_its_date(self):
        levels = {'a': [(date(2026, 1, 1), 'mid'), (date(2026, 9, 15), 'senior')]}
        days = [date(2026, 9, 1), date(2026, 9, 20)]
        cap, low, high = member_capacity(['a'], days, [], levels)['a']
        self.assertAlmostEqual(cap, 1.0 + 1.3)
        self.assertAlmostEqual(low, 3 * 2.3)
        self.assertAlmostEqual(high, 6 * 2.3)

    def test_level_before_first_row_is_earliest_known(self):
        levels = {'a': [(date(2026, 9, 15), 'junior')]}
        self.assertAlmostEqual(member_capacity(['a'], [date(2026, 1, 1)], [], levels)['a'][0], 0.7)

    def test_settings_version_applies_from_its_date(self):
        tl = [(date(2026, 9, 10), {'seniority_weights': {'mid': 0.5}, 'per_sprint_limits': {'under': 2}})]
        cap, low, high = member_capacity(['a'], [date(2026, 9, 1), date(2026, 9, 20)], tl, {})['a']
        self.assertAlmostEqual(cap, 1.0 + 0.5)  # defaults before the first version
        self.assertAlmostEqual(low, 3 * 1.0 + 2 * 0.5)
        self.assertAlmostEqual(high, 6 * 1.0 + 6 * 0.5)

    def test_allocation_of_each_sprints_month(self):
        alloc = [((2026, 8), {'a': 0.5}), ((2026, 10), {'a': 0.25})]
        cap = member_capacity(['a'], [date(2026, 8, 20), date(2026, 9, 5), date(2026, 10, 2)], [], {}, alloc)['a'][0]
        self.assertAlmostEqual(cap, 0.5 + 0.5 + 0.25)  # September uses August's published month

    def test_missing_from_a_month_uses_todays_share(self):
        from unittest import mock
        alloc = [((2026, 8), {'a': 0.5}), ((2026, 10), {'a': 0.25, 'b': 0.4})]
        with mock.patch('django.utils.timezone.localdate', return_value=date(2026, 10, 20)):
            caps = member_capacity(['a', 'b', 'c'], [date(2026, 9, 5), date(2026, 10, 2)], [], {}, alloc)
        self.assertAlmostEqual(caps['a'][0], 0.5 + 0.25)
        self.assertAlmostEqual(caps['b'][0], 0.4 + 0.4)  # joined in October: September uses today's 40%
        self.assertAlmostEqual(caps['c'][0], 1.0 + 1.0)  # never allocated = 100%


class UserLevelSaveTest(TenantTestCase):
    """PATCHing seniority records a dated level row; User.seniority mirrors the level in effect today."""

    def test_backdated_and_future_levels(self):
        from users.models import User
        from users.serializers import UserSerializer

        manager = User.objects.create_user(username='m', email='m@x.test', password='p', is_manager=True)
        dev = User.objects.create_user(username='d', email='d@x.test', password='p')
        request = APIRequestFactory().patch('/')
        request.user = manager

        def patch(data):
            s = UserSerializer(dev, data=data, partial=True, context={'request': request})
            s.is_valid(raise_exception=True)
            s.save()

        patch({'seniority': 'mid', 'seniority_effective_from': '2026-01-01'})
        patch({'seniority': 'senior', 'seniority_effective_from': '2999-01-01'})
        dev.refresh_from_db()
        self.assertEqual(dev.seniority, 'mid')  # promotion not in effect yet
        self.assertEqual(
            list(dev.level_history.values_list('effective_from', 'seniority')),
            [(date(2026, 1, 1), 'mid'), (date(2999, 1, 1), 'senior')],
        )


class UserLevelRulesTest(TenantTestCase):
    def setUp(self):
        from users.models import User
        super().setUp()
        self.manager = User.objects.create_user(username='m', email='m@x.test', password='p', is_manager=True)
        self.dev = User.objects.create_user(username='d', email='d@x.test', password='p')

    def _patch(self, actor, target, data):
        from users.serializers import UserSerializer
        request = APIRequestFactory().patch('/')
        request.user = actor
        s = UserSerializer(target, data=data, partial=True, context={'request': request})
        ok = s.is_valid()
        if ok:
            s.save()
        return ok

    def test_manager_cannot_change_own_level(self):
        self.assertFalse(self._patch(self.manager, self.manager, {'seniority': 'junior'}))
        self.assertTrue(self._patch(self.manager, self.dev, {'seniority': 'junior'}))

    def test_future_level_shows_once_in_effect(self):
        from unittest import mock
        from users.serializers import UserSerializer
        self._patch(self.manager, self.dev, {'seniority': 'mid', 'seniority_effective_from': '2026-01-01'})
        self._patch(self.manager, self.dev, {'seniority': 'senior', 'seniority_effective_from': '2026-11-01'})
        with mock.patch('django.utils.timezone.localdate', return_value=date(2026, 10, 30)):
            self.assertEqual(UserSerializer(self.dev).data['seniority'], 'mid')
        with mock.patch('django.utils.timezone.localdate', return_value=date(2026, 11, 2)):
            self.assertEqual(UserSerializer(self.dev).data['seniority'], 'senior')  # mirror not re-saved

    def test_unchanged_level_sent_back_is_a_no_op(self):
        # A profile save that echoes the user object back must not fail or add a history row.
        self._patch(self.manager, self.dev, {'seniority': 'mid', 'seniority_effective_from': '2026-01-01'})
        self.assertTrue(self._patch(self.dev, self.dev, {'seniority': 'mid', 'first_name': 'D'}))
        self.assertTrue(self._patch(self.manager, self.manager, {'seniority': None, 'first_name': 'M'}))
        self.assertEqual(self.dev.level_history.count(), 1)

    def test_level_prefers_the_users_own_email(self):
        from data.analytics.workload import level_timelines
        from data.models import UserIdentityMapping
        from users.models import User, UserLevelHistory

        old = User.objects.create_user(username='old', email='old@x.test', password='p')
        UserLevelHistory.objects.create(user=old, seniority='junior', effective_from=date(2020, 1, 1))
        UserLevelHistory.objects.create(user=self.dev, seniority='senior', effective_from=date(2024, 1, 1))
        UserIdentityMapping.objects.create(canonical_email='d@x.test', canonical_name='Dev', source_identities={'jira': ['old@x.test']})
        self.assertEqual(level_timelines(['d@x.test'])['d@x.test'], [(date(2024, 1, 1), 'senior')])

    def test_effective_date_needs_seniority(self):
        self.assertFalse(self._patch(self.manager, self.dev, {'seniority_effective_from': '2026-01-01'}))

    def test_level_found_through_identity_alias(self):
        from data.analytics.workload import level_timelines
        from data.models import UserIdentityMapping
        from users.models import UserLevelHistory

        UserLevelHistory.objects.create(user=self.dev, seniority='senior', effective_from=START)
        UserIdentityMapping.objects.create(canonical_email='D@x.test', canonical_name='Dev', source_identities={'jira': ['dev.jira@other.test']})
        self.assertEqual(level_timelines(['Dev.Jira@other.test']), {'dev.jira@other.test': [(START, 'senior')]})


class WorkloadWarningsTest(TenantTestCase):
    """Banner warnings: settings, allocation sheet, levels, per-member allocation, sprint data."""

    def setUp(self):
        from data.models import AIInsight, Sprint, WorkItem
        from data.signals import ai_insight_telemetry_signal, work_item_telemetry_signal
        from configuration.models import Project, SourceConfiguration
        from users.models import ResourceAllocation, User, UserLevelHistory

        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        super().setUp()
        now = timezone.now()
        self.project = Project.objects.create(tenant=self.tenant, name='OCS', key='OCS')
        self.src = SourceConfiguration.objects.create(project=self.project, source_type='jira', name='J', base_url='https://j.test')
        sprint = Sprint.objects.create(external_id='s1', source_config_id=self.src.id, name='S1',
                                       start_date=now - timezone.timedelta(days=2), end_date=now + timezone.timedelta(days=12))
        for i, name in enumerate(['Asha', 'Bilal']):
            user = User.objects.create_user(username=name, email=f'{name}@x.test', password='p', first_name=name)
            WorkItem.objects.create(external_id=f'w{i}', source_config_id=self.src.id, sprint=sprint, title='t',
                                    status='todo', status_category='todo', created_at=now, updated_at=now,
                                    assignee_email=user.email, resolved_assignee=user)
            if name == 'Asha':
                UserLevelHistory.objects.create(user=user, seniority='mid', effective_from=START)
                ResourceAllocation.objects.create(developer=user, project=self.project, month=now.month,
                                                  year=now.year, percentage_allocated=100, status='PUBLISHED')

    def get(self, params):
        from data.views import WorkloadWarningsView
        from users.models import User
        request = APIRequestFactory().get('/api/dashboard/workload-warnings/', params)
        force_authenticate(request, user=User.objects.first())
        return WorkloadWarningsView.as_view()(request)

    def test_all_gaps_reported(self):
        warnings = {w['code']: w['message'] for w in self.get({'project_id': self.project.id}).data['warnings']}
        # The project's sheet for this month is published (Asha), so only Bilal is missing from it.
        self.assertEqual(set(warnings), {'settings_not_set', 'level_not_set', 'allocation_not_set'})
        self.assertIn('Bilal', warnings['level_not_set'])
        self.assertNotIn('Asha', warnings['level_not_set'])
        self.assertIn('Bilal', warnings['allocation_not_set'])

    def test_complete_setup_has_no_warnings(self):
        from configuration.models import WorkloadSettingsVersion
        from users.models import ResourceAllocation, User, UserLevelHistory
        now = timezone.now()
        bilal = User.objects.get(username='Bilal')
        UserLevelHistory.objects.create(user=bilal, seniority='junior', effective_from=START)
        ResourceAllocation.objects.create(developer=bilal, project=self.project, month=now.month, year=now.year,
                                          percentage_allocated=50, status='PUBLISHED')
        WorkloadSettingsVersion.objects.create(effective_from=START, overrides={})
        self.assertEqual(self.get({'project_id': self.project.id}).data['warnings'], [])

    def test_no_sprint_data_and_bad_project_id(self):
        from configuration.models import Project
        empty = Project.objects.create(tenant=self.tenant, name='New', key='NEW')
        codes = [w['code'] for w in self.get({'project_id': empty.id}).data['warnings']]
        self.assertIn('no_sprint_data', codes)
        self.assertEqual(self.get({'project_id': 'abc'}).status_code, 400)

    def test_unpublished_sheet_reported_once(self):
        from users.models import ResourceAllocation
        ResourceAllocation.objects.update(status='DRAFT')
        codes = [w['code'] for w in self.get({'project_id': self.project.id}).data['warnings']]
        self.assertIn('allocation_not_published', codes)
        self.assertNotIn('allocation_not_set', codes)  # the whole sheet is missing, not just some people

    def test_sheet_check_is_per_tenant(self):
        # Another tenant's published month must not hide this tenant's missing sheet.
        from configuration.models import Project
        from tenants.models import Tenant
        from users.models import MonthlyAllocationStatus, ResourceAllocation, User
        from django_tenants.utils import schema_context
        with schema_context('public'):
            tenant = Tenant(schema_name='other_wl', name='Other', slug='other-wl')
            tenant.auto_create_schema = False  # only the row is needed
            tenant.save()
        other = Project.objects.create(tenant=tenant, name='X', key='X')
        ResourceAllocation.objects.filter(project=self.project).update(status='DRAFT')
        now = timezone.now()
        ResourceAllocation.objects.create(developer=User.objects.get(username='Asha'), project=other, month=now.month,
                                          year=now.year, percentage_allocated=100, status='PUBLISHED')
        # The other tenant published the month (this status table is shared by all tenants).
        MonthlyAllocationStatus.objects.create(month=now.month, year=now.year, status='PUBLISHED')
        codes = [w['code'] for w in self.get({}).data['warnings']]
        self.assertIn('allocation_not_published', codes)


class TeamWorkloadWindowTest(TenantTestCase):
    """All Projects: per-project allocation and recent sprints only; project view: members of the viewed months."""

    def setUp(self):
        from data.models import AIInsight, WorkItem
        from data.signals import ai_insight_telemetry_signal, work_item_telemetry_signal
        from users.models import User

        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        super().setUp()
        self.now = timezone.now()
        self.viewer = User.objects.create_user(username='viewer', email='viewer@x.test', password='p')
        self.n = 0

    def project(self, key):
        from configuration.models import Project, SourceConfiguration
        project = Project.objects.create(tenant=self.tenant, name=key, key=key)
        src = SourceConfiguration.objects.create(project=project, source_type='jira', name=key, base_url='https://j.test')
        return project, src

    def sprint(self, src, start_days_ago, length=14):
        from data.models import Sprint
        self.n += 1
        start = self.now - timezone.timedelta(days=start_days_ago)
        return Sprint.objects.create(external_id=f's{self.n}', source_config_id=src.id, name=f'S{self.n}',
                                     start_date=start, end_date=start + timezone.timedelta(days=length))

    def items(self, src, sprint, email, count):
        from data.models import WorkItem
        for _ in range(count):
            self.n += 1
            WorkItem.objects.create(external_id=f'w{self.n}', source_config_id=src.id, sprint=sprint, title='t',
                                    status='todo', status_category='todo', created_at=self.now, updated_at=self.now,
                                    assignee_email=email)

    def allocate(self, email, project, pct, month_offset=0):
        from users.models import ResourceAllocation, User
        user = User.objects.filter(email=email).first() or User.objects.create_user(username=email, email=email, password='p')
        month, year = self.now.month + month_offset, self.now.year
        if month < 1:
            month, year = month + 12, year - 1
        ResourceAllocation.objects.create(developer=user, project=project, month=month, year=year,
                                          percentage_allocated=pct, status='PUBLISHED')

    def get(self, params=None):
        from data.views import AssigneeDistributionView
        request = APIRequestFactory().get('/api/dashboard/assignee-distribution/', params or {})
        force_authenticate(request, user=self.viewer)
        return {r['email']: r for r in AssigneeDistributionView.as_view()(request).data}

    def test_all_projects_uses_each_projects_allocation(self):
        x, src_x = self.project('X')
        y, src_y = self.project('Y')
        sx, sy = self.sprint(src_x, 3), self.sprint(src_y, 3)
        self.items(src_x, sx, 'half@x.test', 2)  # 50% on X only
        self.items(src_x, sx, 'both@x.test', 3)  # 50% on X and 50% on Y
        self.items(src_y, sy, 'both@x.test', 3)
        self.allocate('half@x.test', x, 50)
        self.allocate('both@x.test', x, 50)
        self.allocate('both@x.test', y, 50)
        rows = self.get()
        self.assertEqual((rows['half@x.test']['ideal_min'], rows['half@x.test']['ideal_max']), (2, 2))  # 0.5 capacity
        self.assertEqual((rows['both@x.test']['ideal_min'], rows['both@x.test']['ideal_max']), (3, 5))  # 0.5 + 0.5
        self.assertEqual(rows['both@x.test']['workload_status'], 'Overloaded')  # 6 items > 5

    def test_all_projects_skips_stale_projects_sprints(self):
        _, src_live = self.project('LIVE')
        _, src_old = self.project('OLD')
        self.items(src_live, self.sprint(src_live, 3), 'dev@x.test', 3)
        self.items(src_old, self.sprint(src_old, 300), 'dev@x.test', 10)  # project stopped running sprints
        self.assertEqual(self.get()['dev@x.test']['total'], 3)

    def test_project_view_members_follow_viewed_sprints_month(self):
        project, src = self.project('OCS')
        last_month = self.sprint(src, timezone.localdate().day + 10)  # starts in the previous month
        self.items(src, last_month, 'old@x.test', 3)
        self.items(src, last_month, 'new@x.test', 3)
        self.allocate('old@x.test', project, 100, month_offset=-1)
        self.allocate('new@x.test', project, 100, month_offset=0)
        rows = self.get({'project_id': str(project.id), 'sprint_ids': str(last_month.id)})
        self.assertEqual(set(rows), {'old@x.test'})  # last month's sheet, not this month's
