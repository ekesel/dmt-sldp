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
        self.assertEqual((r['a']['ideal_min'], r['a']['ideal_max']), (15, 29))  # 5 x 6 = overload, max = 29
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
        self.assertEqual(statuses(r), {'a': 'Overloaded', 'b': 'Balanced'})  # Max 5 = overload, ideal max 4


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
        expected.update(ekansh='Overloaded', niharika='Overloaded', abhijit='Underutilised')  # 6 = Max = overload
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
                                       start_date=now - timezone.timedelta(days=2), end_date=now - timezone.timedelta(minutes=1))
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

    def test_cycle_time_skips_bugs_like_dashboard(self):
        from datetime import datetime
        from data.models import Sprint, WorkItem
        from data.views import AssigneeDistributionView

        tz = timezone.get_current_timezone()
        mon, wed, fri = (timezone.make_aware(datetime(2026, 10, d, 10), tz) for d in (26, 28, 30))
        sprint = Sprint.objects.get(external_id='s1')
        for ext, kind, done in (('story', 'story', wed), ('bug', 'bug', fri)):
            WorkItem.objects.create(external_id=ext, source_config_id=sprint.source_config_id, sprint=sprint,
                                    title='t', item_type=kind, status='done', status_category='done',
                                    created_at=mon, updated_at=done, started_at=mon, resolved_at=done,
                                    assignee_email='sakshi@x.test')

        request = APIRequestFactory().get('/api/dashboard/assignee-distribution/', {'project_id': str(self.project.id)})
        force_authenticate(request, user=self.viewer)
        rows = {r['email']: r for r in AssigneeDistributionView.as_view()(request).data}
        self.assertEqual(rows['sakshi@x.test']['completed'], 2)  # bug still counted as work
        self.assertEqual(rows['sakshi@x.test']['avg_cycle_time_days'], 2.0)  # story only: Mon -> Wed

    def test_cycle_time_ends_at_jira_first_resolution(self):
        from datetime import datetime
        from data.analytics.metrics import MetricService
        from data.models import Sprint, WorkItem
        from data.views import AssigneeDistributionView

        tz = timezone.get_current_timezone()
        mon, fri = (timezone.make_aware(datetime(2026, 10, d, 10), tz) for d in (26, 30))
        sprint = Sprint.objects.get(external_id='s1')
        # Resolved Wed, moved back into Done on release day (Fri): cycle time ends Wed, like Jira.
        WorkItem.objects.create(external_id='SM-1', source_config_id=sprint.source_config_id, sprint=sprint,
                                title='t', item_type='story', status='Done', status_category='done',
                                created_at=mon, updated_at=fri, started_at=mon, resolved_at=fri,
                                assignee_email='sakshi@x.test',
                                raw_source_data={'fields': {'resolutiondate': '2026-10-28T10:00:00.000+0530'}})
        WorkItem.objects.create(external_id='other', source_config_id=sprint.source_config_id, sprint=sprint,
                                title='t', item_type='story', status='Done', status_category='done',
                                created_at=mon, updated_at=fri, started_at=mon, resolved_at=fri,
                                assignee_email='shashi@x.test')  # no resolutiondate: resolved_at

        request = APIRequestFactory().get('/api/dashboard/assignee-distribution/', {'project_id': str(self.project.id)})
        force_authenticate(request, user=self.viewer)
        rows = {r['email']: r for r in AssigneeDistributionView.as_view()(request).data}
        self.assertEqual(rows['sakshi@x.test']['avg_cycle_time_days'], 2.0)
        self.assertEqual(rows['shashi@x.test']['avg_cycle_time_days'], 4.0)
        self.assertEqual(MetricService.calculate_cycle_time(WorkItem.objects.filter(external_id='SM-1')), 2.0)

    def test_closed_without_work_is_not_workload(self):
        from data.models import Sprint, WorkItem
        from data.views import AssigneeDistributionView

        sprint = Sprint.objects.get(external_id='s1')
        now = timezone.now()
        for st in ('Closed', 'duplicate', 'not a bug', 'done'):
            WorkItem.objects.create(external_id=st, source_config_id=sprint.source_config_id, sprint=sprint, title='t',
                                    status=st, status_category='done', created_at=now, updated_at=now,
                                    assignee_email='sakshi@x.test')

        request = APIRequestFactory().get('/api/dashboard/assignee-distribution/', {'project_id': str(self.project.id)})
        force_authenticate(request, user=self.viewer)
        rows = {r['email']: r for r in AssigneeDistributionView.as_view()(request).data}
        self.assertEqual((rows['sakshi@x.test']['total'], rows['sakshi@x.test']['completed']), (5, 1))  # only 'done'

    def test_co_assignee_gets_credit(self):
        from data.models import Sprint, WorkItem
        from data.views import AssigneeDistributionView

        sprint = Sprint.objects.get(external_id='s1')
        now = timezone.now()
        WorkItem.objects.create(external_id='joint', source_config_id=sprint.source_config_id, sprint=sprint,
                                title='t', status='done', status_category='done', created_at=now, updated_at=now,
                                assignee_email='sakshi@x.test',
                                # ghost: no portal user behind it, so no separate row.
                                raw_source_data={'assignees': [{'email': 'sakshi@x.test'}, {'email': 'Shashi@x.test'},
                                                               {'email': 'ghost@x.test'}]},
                                # Sub-task worker only: not an assignee of the item, gets no credit.
                                assignee_contributions=[{'email': 'affan@x.test'}])

        request = APIRequestFactory().get('/api/dashboard/assignee-distribution/', {'project_id': str(self.project.id)})
        force_authenticate(request, user=self.viewer)
        rows = {r['email']: r for r in AssigneeDistributionView.as_view()(request).data}
        self.assertEqual((rows['sakshi@x.test']['total'], rows['sakshi@x.test']['completed']), (5, 1))  # not twice
        self.assertEqual((rows['shashi@x.test']['total'], rows['shashi@x.test']['completed']), (4, 1))
        self.assertEqual(rows['affan@x.test']['total'], 2)
        self.assertNotIn('ghost@x.test', rows)


class EffectiveDatedCapacityTests(SimpleTestCase):
    """Each sprint uses the level, settings and allocation in effect on its day."""

    def test_promotion_counts_only_from_its_date(self):
        levels = {'a': [(date(2026, 1, 1), 'mid'), (date(2026, 9, 15), 'senior')]}
        days = [date(2026, 9, 1), date(2026, 9, 20)]
        cap, low, high = member_capacity(['a'], days, [], levels)['a']
        self.assertAlmostEqual(cap, 1.0 + 1.3)
        self.assertEqual(low, 3 + 4)  # ceil(3 x 1.0) + ceil(3 x 1.3), each sprint rounded
        self.assertEqual(high, 6 + 8)  # ceil(6 x 1.0) + ceil(6 x 1.3)

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

    def test_missing_from_a_month_uses_nearest_known_month(self):
        alloc = [((2026, 8), {'a': 0.5}), ((2026, 10), {'b': 0.4}), ((2026, 11), {'a': 0.8, 'b': 0.4})]
        days = [date(2026, 9, 5), date(2026, 10, 2), date(2026, 11, 3)]
        caps = member_capacity(['a', 'b', 'c'], days, [], {}, alloc)
        self.assertAlmostEqual(caps['a'][0], 0.5 + 0.5 + 0.8)  # not in October's sheet: August's 50%, not 100%
        self.assertAlmostEqual(caps['b'][0], 0.4 + 0.4 + 0.4)  # joined in October: September uses its first month
        self.assertAlmostEqual(caps['c'][0], 3.0)  # never allocated = 100%

    def test_left_project_is_not_a_gap(self):
        from data.analytics.workload import allocation_for
        alloc = [((2026, 7), {'a': 0.8}), ((2026, 8), {'b': 1.0}), ((2026, 9), {'b': 1.0})]
        self.assertIsNone(allocation_for(alloc, 'a', date(2026, 11, 3)))  # sheets since July without a: left
        self.assertEqual(allocation_for(alloc, 'a', date(2026, 7, 20)), 0.8)
        self.assertEqual(allocation_for(alloc[:1], 'a', date(2026, 11, 3)), 0.8)  # no sheet since: still July's


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
                                       start_date=now - timezone.timedelta(days=2), end_date=now - timezone.timedelta(minutes=1))
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
        # Completed (ended just now at the latest): the default window leaves the running sprint out.
        end = min(start + timezone.timedelta(days=length), self.now - timezone.timedelta(minutes=1))
        return Sprint.objects.create(external_id=f's{self.n}', source_config_id=src.id, name=f'S{self.n}',
                                     start_date=start, end_date=end)

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

    def test_ado_tasks_under_issues_count_but_jira_subtasks_do_not(self):
        from configuration.models import SourceConfiguration
        from data.models import WorkItem
        project, jira = self.project('MIX')
        ado = SourceConfiguration.objects.create(project=project, source_type='azure_devops', name='ado',
                                                 base_url='https://dev.azure.com/x')
        sj, sa = self.sprint(jira, 5), self.sprint(ado, 5)

        def item(src, sprint, item_type, parent=None):
            self.n += 1
            return WorkItem.objects.create(external_id=f'm{self.n}', source_config_id=src.id, sprint=sprint, title='t',
                                           status='In Progress', status_category='in_progress', item_type=item_type,
                                           parent=parent, created_at=self.now, updated_at=self.now,
                                           assignee_email='dev@x.test')

        item(jira, sj, 'task', item(jira, sj, 'story'))  # Jira story + sub-task: story only
        item(ado, sa, 'task', item(ado, sa, 'issue'))  # ADO issue + task: both
        self.assertEqual(self.get({'project_id': project.id})['dev@x.test']['in_progress'], 3)

    def test_jira_carried_over_open_issue_counts_in_window(self):
        from data.models import Sprint, WorkItem
        project, src = self.project('SM')
        done_sprint = self.sprint(src, 20)
        done_sprint.external_id = 'jira_sprint_24'
        done_sprint.save()
        running = Sprint.objects.create(external_id='jira_sprint_25', source_config_id=src.id, name='S25',
                                        start_date=self.now - timezone.timedelta(days=1),
                                        end_date=self.now + timezone.timedelta(days=13))

        def issue(key, status_category, sprints, other=None):
            fields = {'customfield_10020': [{'id': n, 'state': 'closed', 'boardId': 1} for n in sprints]}
            fields.update(other or {})
            WorkItem.objects.create(external_id=key, source_config_id=src.id, sprint=running, title='t', status='s',
                                    status_category=status_category, created_at=self.now, updated_at=self.now,
                                    assignee_email='dev@x.test', raw_source_data={'fields': fields})

        issue('SM-1', 'in_progress', [24, 25])  # carried over from Sprint 24: counts
        issue('SM-2', 'done', [24, 25])  # done in Sprint 25: belongs to Sprint 25
        issue('SM-3', 'in_progress', [25])  # never in the window
        issue('SM-4', 'in_progress', [25], {'customfield_1': [{'id': 24, 'value': 'option'}]})  # not a sprint field
        row = self.get({'project_id': project.id})['dev@x.test']
        self.assertEqual((row['total'], row['in_progress'], row['completed']), (1, 1, 0))
        # All Projects counts it too.
        self.assertEqual(self.get()['dev@x.test']['in_progress'], 1)

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
        self.assertEqual((rows['half@x.test']['ideal_min'], rows['half@x.test']['ideal_max']), (2, 2))  # 0.5 capacity: ceil 1.5 .. ceil 3 - 1
        self.assertEqual((rows['both@x.test']['ideal_min'], rows['both@x.test']['ideal_max']), (4, 5))  # 2 + 2 .. 3 + 3 - 1
        self.assertEqual(rows['both@x.test']['workload_status'], 'Overloaded')  # 6 items = overload
        self.assertEqual(rows['both@x.test']['workload_note'], 'Ideal 4–5 tasks · has 6')
        self.assertEqual(rows['both@x.test']['allocation_note'], 'X 50% · Y 50%')

    def test_all_projects_skips_project_without_allocation(self):
        from data.analytics.workload import workload_warnings
        x, src_x = self.project('X')
        _, src_y = self.project('Y')
        sx, sy = self.sprint(src_x, 3), self.sprint(src_y, 3)
        self.items(src_x, sx, 'dev@x.test', 3)
        self.items(src_y, sy, 'dev@x.test', 3)  # never allocated to Y
        self.items(src_y, sy, 'free@x.test', 4)  # allocated nowhere
        self.allocate('dev@x.test', x, 50)
        self.allocate('free@x.test', x, 0)
        from data.models import WorkItem
        from users.models import User
        for user in User.objects.filter(email__in=['dev@x.test', 'free@x.test']):
            WorkItem.objects.filter(assignee_email=user.email).update(resolved_assignee=user)
        rows = self.get()
        self.assertEqual(rows['dev@x.test']['capacity'], 0.5)  # Y adds nothing, not another 100%
        self.assertEqual(rows['dev@x.test']['workload_status'], 'Overloaded')  # 6 items vs 2-2
        self.assertEqual(rows['free@x.test']['capacity'], 1.0)
        self.assertEqual(rows['dev@x.test']['allocations'], [{'project_id': x.id, 'project': 'X', 'percent': 50}])
        self.assertEqual(rows['dev@x.test']['allocation_note'], 'X 50% · 50% unallocated')
        self.assertEqual(rows['free@x.test']['allocation_note'], 'No allocation set (counted at 100%)')
        codes = {w['code']: w['message'] for w in workload_warnings()}
        self.assertIn('dev@x.test', codes['allocation_missing_project'])
        self.assertNotIn('free@x.test', codes['allocation_missing_project'])

    def test_project_view_note_shows_other_projects_and_gap(self):
        ocs, src = self.project('OCS')
        dmt, _ = self.project('DMT')
        sprint = self.sprint(src, 3)
        self.items(src, sprint, 'dev@x.test', 10)
        self.allocate('dev@x.test', ocs, 80)
        self.allocate('dev@x.test', dmt, 10)
        row = self.get({'project_id': str(ocs.id)})['dev@x.test']
        self.assertEqual(row['workload_note'], 'Ideal 3–4 tasks · has 10')
        self.assertEqual(row['allocation_note'], 'OCS 80% · DMT 10% · 10% unallocated')
        self.assertEqual([a['percent'] for a in row['allocations']], [80, 10])

    def test_project_view_keeps_member_missing_from_sprint_month(self):
        project, src = self.project('OCS')
        dmt, _ = self.project('DMT')
        last_month = self.sprint(src, timezone.localdate().day + 10)
        self.items(src, last_month, 'gap@x.test', 3)
        self.items(src, last_month, 'other@x.test', 3)
        self.allocate('gap@x.test', project, 80, month_offset=-2)
        self.allocate('other@x.test', project, 100, month_offset=-1)  # last month's sheet exists without gap
        self.allocate('gap@x.test', project, 50, month_offset=0)  # back this month: a gap, not leaving
        self.allocate('dmt@x.test', dmt, 10, month_offset=-1)
        self.items(src, last_month, 'dmt@x.test', 1)
        rows = self.get({'project_id': str(project.id), 'sprint_ids': str(last_month.id)})
        self.assertIn('gap@x.test', rows)  # not in last month's sheet: the month before still applies
        self.assertEqual(rows['gap@x.test']['capacity'], 0.8)
        self.assertNotIn('dmt@x.test', rows)  # never allocated to OCS

    def test_project_view_note_when_viewed_project_not_set(self):
        project, src = self.project('OCS')
        dmt, _ = self.project('DMT')
        sprint = self.sprint(src, 3)
        self.items(src, sprint, 'a@x.test', 3)
        self.items(src, sprint, 'b@x.test', 3)
        self.allocate('a@x.test', project, 100)
        self.allocate('b@x.test', dmt, 10)
        from data.analytics import workload
        from unittest import mock
        with mock.patch.object(workload, 'allocation_timeline', wraps=workload.allocation_timeline) as loads:
            rows = self.get({'project_id': str(project.id)})
        self.assertEqual(loads.call_count, 2)  # OCS once (reused for the tooltip) + DMT once
        self.assertEqual(rows['a@x.test']['allocation_note'], 'OCS 100%')
        new, new_src = self.project('NEW')  # no sheet at all for NEW: everyone kept, counted at 100%
        self.items(new_src, self.sprint(new_src, 3), 'b@x.test', 3)
        row = self.get({'project_id': str(new.id)})['b@x.test']
        self.assertEqual(row['capacity'], 1.0)
        self.assertEqual(row['allocation_note'], 'NEW not set (counted at 100%) · DMT 10% · 90% unallocated')

    def test_allocations_found_under_x_tenant_header(self):
        # X-Tenant header -> schema_context, whose connection.tenant has no id: match the tenant by schema.
        from django_tenants.utils import schema_context
        from data.analytics.workload import workload_warnings
        ocs, src = self.project('OCS')
        self.items(src, self.sprint(src, 3), 'dev@x.test', 4)
        self.allocate('dev@x.test', ocs, 80)
        with schema_context(self.tenant.schema_name):
            row = self.get({'project_id': str(ocs.id)})['dev@x.test']
            codes = [w['code'] for w in workload_warnings()]
        self.assertEqual(row['allocation_note'], 'OCS 80% · 20% unallocated')
        self.assertNotIn('allocation_not_published', codes)

    def test_zero_in_a_viewed_month_is_flagged(self):
        # Awantika: 0% last month, allocated this month; the card shows both months' sprints.
        from calendar import month_abbr
        from data.analytics.workload import workload_warnings
        from data.models import WorkItem
        from users.models import User
        ocs, src = self.project('OCS')
        old = self.sprint(src, timezone.localdate().day + 10)
        new = self.sprint(src, 1)
        self.items(src, old, 'aw@x.test', 1)
        self.items(src, new, 'aw@x.test', 1)
        self.items(src, new, 'ok@x.test', 1)
        self.allocate('aw@x.test', ocs, 0, month_offset=-1)
        self.allocate('ok@x.test', ocs, 100, month_offset=-1)  # last month's sheet is published
        self.allocate('aw@x.test', ocs, 50)
        self.allocate('ok@x.test', ocs, 100)
        for user in User.objects.filter(email__in=['aw@x.test', 'ok@x.test']):
            WorkItem.objects.filter(assignee_email=user.email).update(resolved_assignee=user)
        rows = self.get({'project_id': str(ocs.id)})
        last = old.start_date.astimezone(timezone.get_current_timezone())
        month = f'{last.year}-{last.month:02d}'
        self.assertEqual(rows['aw@x.test']['allocation_gaps'], [{'project_id': ocs.id, 'project': 'OCS', 'month': month}])
        self.assertIn(f'No allocation in {month_abbr[last.month]} {last.year} (OCS)', rows['aw@x.test']['allocation_note'])
        self.assertEqual(rows['ok@x.test']['allocation_gaps'], [])
        message = {w['code']: w['message'] for w in workload_warnings(ocs.id)}['allocation_not_set']
        self.assertIn('aw@x.test', message)
        self.assertNotIn('ok@x.test', message)
        # Banner window: completed sprints by default; a picked running sprint still counts, as on the card.
        from data.analytics.workload import window_sprints
        from data.models import Sprint
        running = Sprint.objects.create(external_id='run', source_config_id=src.id, name='Run',
                                        start_date=self.now - timezone.timedelta(days=1),
                                        end_date=self.now + timezone.timedelta(days=13))
        self.assertNotIn(running.id, [sid for sid, _ in window_sprints(ocs.id)[ocs.id]])
        self.assertEqual([sid for sid, _ in window_sprints(ocs.id, [str(running.id)])[ocs.id]], [running.id])

    def test_all_projects_skips_stale_projects_sprints(self):
        _, src_live = self.project('LIVE')
        _, src_old = self.project('OLD')
        self.items(src_live, self.sprint(src_live, 3), 'dev@x.test', 3)
        self.items(src_old, self.sprint(src_old, 300), 'dev@x.test', 10)  # project stopped running sprints
        self.assertEqual(self.get()['dev@x.test']['total'], 3)

    def test_running_sprint_only_when_picked(self):
        from data.models import Sprint
        project, src = self.project('OCS')
        self.items(src, self.sprint(src, 3), 'dev@x.test', 3)
        running = Sprint.objects.create(external_id='run', source_config_id=src.id, name='Running',
                                        start_date=self.now - timezone.timedelta(days=1),
                                        end_date=self.now + timezone.timedelta(days=13))
        self.items(src, running, 'dev@x.test', 5)
        # Default window = completed sprints, like the KPI cards.
        self.assertEqual(self.get({'project_id': str(project.id)})['dev@x.test']['total'], 3)
        self.assertEqual(self.get()['dev@x.test']['total'], 3)  # All Projects too
        picked = self.get({'project_id': str(project.id), 'sprint_ids': str(running.id)})
        self.assertEqual(picked['dev@x.test']['total'], 5)

    def test_project_view_members_follow_viewed_sprints_month(self):
        project, src = self.project('OCS')
        last_month = self.sprint(src, timezone.localdate().day + 10)  # starts in the previous month
        self.items(src, last_month, 'old@x.test', 3)
        self.items(src, last_month, 'new@x.test', 3)
        self.allocate('old@x.test', project, 100, month_offset=-1)
        self.allocate('new@x.test', project, 100, month_offset=0)
        rows = self.get({'project_id': str(project.id), 'sprint_ids': str(last_month.id)})
        self.assertEqual(set(rows), {'old@x.test'})  # last month's sheet, not this month's


class WorkingDaysTest(SimpleTestCase):
    """Team card cycle time uses the dashboard's working-day count."""

    def test_weekends_and_holidays_skipped(self):
        from datetime import datetime
        from data.analytics.metrics import MetricService

        tz = timezone.get_current_timezone()
        fri = timezone.make_aware(datetime(2026, 10, 30, 10), tz)
        tue = timezone.make_aware(datetime(2026, 11, 3, 10), tz)
        self.assertEqual(MetricService.working_days(fri, tue, set()), 2)  # Mon + Tue
        self.assertEqual(MetricService.working_days(fri, tue, {date(2026, 11, 2)}), 1)
        self.assertEqual(MetricService.working_days(fri, fri, set()), 0)
        self.assertIsNone(MetricService.working_days(tue, fri, set()))


class DocRulesTests(SimpleTestCase):
    """Ranges and status split from the QA workload doc (Workload Calculations for Projects)."""

    def test_ranges_match_doc(self):
        from data.analytics.workload import ideal_range
        cases = [  # (level weight, allocation, sprints) -> doc range
            ((0.7, 0.8, 5), (10, 19)),  # Website Revamp, Divya
            ((0.7, 0.8, 1), (2, 3)),
            ((1.0, 0.5, 5), (10, 14)),  # CORA, Ankit
            ((1.0, 0.6, 5), (10, 19)),  # CORA, Sumit
            ((1.0, 0.8, 5), (15, 24)),  # CORA, Ashutosh
            ((1.3, 1.0, 5), (20, 39)),  # OCS, Ekaansh
            ((1.0, 1.0, 1), (3, 5)),
        ]
        for (w, alloc, n), expected in cases:
            c = w * alloc
            low = n * -(-round(3 * c, 6) // 1)
            high = n * -(-round(6 * c, 6) // 1)
            self.assertEqual(ideal_range(low, high), expected, (w, alloc, n))
            level = {0.7: 'junior', 1.0: 'mid', 1.3: 'senior'}[w]
            r = classify_workload({'a': 1}, {'a': level}, n, DEFAULT_SETTINGS, {'a': alloc})
            self.assertEqual((r['a']['ideal_min'], r['a']['ideal_max']), expected, (w, alloc, n))

    def test_status_split_by_name(self):
        from data.analytics.workload import workload_bucket
        for status in ('In Testing', 'In Review', 'QA', 'Blocked', 'On Hold', 'Reopened', 'Doing', 'In UAT'):
            self.assertEqual(workload_bucket(status, 'done'), 'in_progress', status)
        for status in ('Done', 'Completed', 'QA Verified', 'Deployed on Dev', 'Resolved', 'complete', 'Dev Approved'):
            self.assertEqual(workload_bucket(status, 'in_progress'), 'done', status)
        self.assertEqual(workload_bucket('Ready for Deployment (Prod)', 'done'), 'done')  # not listed: tool's category
        self.assertEqual(workload_bucket('To Do', 'todo'), 'todo')
