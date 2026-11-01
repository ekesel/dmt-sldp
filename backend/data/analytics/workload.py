"""
Capacity-based workload status (Team Workload card + Individual workload).

capacity    = seniority_weight * allocation   (allocation = share of time on the project, 1.0 if unknown)
ideal range = ceil(sum of under * capacity) .. ceil(sum of over * capacity) - 1 items, summed over the sprints
Level, weights/limits and allocation are effective-dated: each sprint uses the values in effect on its start day.
  Overloaded    : items above the ideal range
  Underutilised : items below the ideal range
  Balanced      : inside it
The team percentile of items / capacity is always returned as a rank. With use_percentile on, it also
gates the status (above overload_percentile / at or below underutil_percentile) for teams of small_team_min+.
"""
from bisect import bisect_left, bisect_right
from math import ceil

DEFAULT_SETTINGS = {
    'sprint_window': 5,
    # Off: status comes from each person's ideal range alone; the percentile is only a rank.
    'use_percentile': False,
    'overload_percentile': 80,
    'underutil_percentile': 40,
    'per_sprint_limits': {'under': 3, 'over': 6},
    'small_team_min': 3,
    # Expected share of development time vs a mid dev; lower it for roles with meeting-heavy days.
    'seniority_weights': {'junior': 0.7, 'mid': 1.0, 'senior': 1.3},
    # False: count only top-level items (no parent, or parent is an epic); sub-tasks repeat their parent's work.
    'count_subtasks': False,
    # Scale capacity by the developer's published allocation on the project being viewed.
    'use_allocation': True,
    # Floor (in %) so a tiny allocation doesn't turn one item into a huge load.
    'min_allocation': 10,
}


def workload_items(qs, settings):
    """WorkItem queryset narrowed to what counts as workload: never epics, sub-tasks only if enabled."""
    from django.db.models import Q

    qs = qs.exclude(item_type='epic')
    if not settings['count_subtasks']:
        qs = qs.filter(Q(parent__isnull=True) | Q(parent__item_type='epic'))
    return qs


def latest_sprint_ids_per_project():
    """Id of the latest started sprint of each project in the current tenant schema."""
    from django.db.models import F, Q
    from django.utils import timezone
    from configuration.models import SourceConfiguration
    from data.models import Sprint

    now = timezone.now()
    sprints = list(
        Sprint.objects.filter(Q(start_date__lte=now) | Q(end_date__lt=now))
        .order_by(F('end_date').desc(nulls_last=True), F('start_date').desc(nulls_last=True))
        .values_list('id', 'source_config_id')
    )
    project_of = dict(
        SourceConfiguration.objects.filter(id__in={src for _, src in sprints}).values_list('id', 'project_id')
    )
    latest = {}
    for sprint_id, src in sprints:
        latest.setdefault(project_of.get(src), sprint_id)
    latest.pop(None, None)
    return list(latest.values())


def merge_settings(overrides):
    """Overrides merged over DEFAULT_SETTINGS (nested dicts merged key by key)."""
    overrides = overrides or {}
    merged = {**DEFAULT_SETTINGS, **overrides}
    for key in ('per_sprint_limits', 'seniority_weights'):
        merged[key] = {**DEFAULT_SETTINGS[key], **(overrides.get(key) or {})}
    return merged


def _as_of(timeline, when):
    """Value of the last (start, value) entry starting on or before `when`; None if `when` is earlier."""
    value = None
    for start, v in timeline:
        if start > when:
            break
        value = v
    return value


def sprint_day(start, end=None):
    """Local day a sprint is judged on (level, settings, allocation): its start, else its end, else today."""
    from django.utils import timezone

    when = start or end
    return timezone.localdate(when) if when else timezone.localdate()


def settings_timeline():
    """[(effective_from, overrides), ...] of the saved workload settings versions, oldest first."""
    from django_tenants.utils import schema_context
    from configuration.models import WorkloadSettingsVersion

    with schema_context('public'):
        return list(WorkloadSettingsVersion.objects.order_by('effective_from').values_list('effective_from', 'overrides'))


def get_workload_settings(day=None, timeline=None):
    """Settings in effect on `day` (default today) merged over DEFAULT_SETTINGS; defaults before the first version."""
    from django.utils import timezone

    if timeline is None:
        timeline = settings_timeline()
    return merge_settings(_as_of(timeline, day or timezone.localdate()))


def level_timelines(emails, resolver=None):
    """
    {lowercased email: [(effective_from, level), ...]} for portal users with a saved level.
    An email matches a portal user by the user's own email first, else by a linked identity alias.
    """
    from collections import defaultdict
    from django.db.models.functions import Lower
    from users.models import UserLevelHistory
    from .identity_resolver import IdentityResolver

    if resolver is None:
        resolver = IdentityResolver()
        resolver.load()
    key_of = {}  # any alias -> the requested key
    for email in emails:
        key = email.lower()
        for alias in set(resolver.all_aliases(resolver.resolve(key))) | {key}:
            key_of.setdefault(alias.lower(), key)
    rows = (
        UserLevelHistory.objects.annotate(email_l=Lower('user__email'))
        .filter(email_l__in=list(key_of))
        .order_by('effective_from')
        .values_list('email_l', 'user_id', 'effective_from', 'seniority')
    )
    per_user = defaultdict(dict)  # key -> {user_id: (user email, timeline)}; one portal account per key
    for email, user_id, day, level in rows:
        per_user[key_of[email]].setdefault(user_id, (email, []))[1].append((day, level))
    out = {}
    for key, users in per_user.items():
        exact = [tl for email, tl in users.values() if email == key]
        out[key] = exact[0] if exact else next(iter(users.values()))[1]
    return out


def level_on(timeline, day):
    """Level on `day`; before the first row the earliest known level applies. None = mid."""
    if not timeline:
        return None
    earlier = [level for start, level in timeline if start <= day]
    return earlier[-1] if earlier else timeline[0][1]


def allocation_timeline(project_id):
    """[((year, month), {lowercased email or alias: fraction}), ...] for the project's published months, oldest first."""
    from users.models import ResourceAllocation
    from .identity_resolver import IdentityResolver

    rows = list(
        ResourceAllocation.objects.filter(project_id=project_id, status='PUBLISHED', percentage_allocated__gt=0)
        .values_list('year', 'month', 'developer__email', 'percentage_allocated')
    )
    if not rows:
        return []
    resolver = IdentityResolver()
    resolver.load()
    months = {}
    for year, month, email, pct in rows:
        if not email:
            continue
        email = email.strip().lower()
        canonical = resolver.resolve(email)
        month_map = months.setdefault((year, month), {})
        for key in set(resolver.all_aliases(canonical)) | {canonical, email}:
            month_map[key.lower()] = float(pct) / 100
    return sorted(months.items())


def allocation_on(timeline, day):
    """Allocation map of the latest published month on or before `day`'s month; {} if none."""
    return _as_of(timeline, (day.year, day.month)) or {}


def member_capacity(keys, days, settings_tl, levels, alloc_tl=None):
    """
    {key: (capacity, ideal_low, ideal_high)} summed over the sprints, one judging `day` each: every sprint
    uses the level, weights, limits and allocation in effect on its day. alloc_tl None = allocation not used.
    """
    from django.utils import timezone

    # Not in a sprint month's published allocation (e.g. joined the project later): use today's share, else 100%.
    current = allocation_on(alloc_tl, timezone.localdate()) if alloc_tl is not None else {}
    per_day = [
        (day, get_workload_settings(day, settings_tl), allocation_on(alloc_tl, day) if alloc_tl is not None else None)
        for day in days
    ]
    out = {}
    for k in keys:
        cap = low = high = 0.0
        for day, s, alloc_map in per_day:
            alloc = alloc_map.get(k, current.get(k, 1.0)) if alloc_map is not None and s['use_allocation'] else 1.0
            alloc = min(max(alloc, s['min_allocation'] / 100), 1.0)
            c = (s['seniority_weights'].get(level_on(levels.get(k), day) or 'mid') or 1.0) * alloc
            cap += c
            low += s['per_sprint_limits']['under'] * c
            high += s['per_sprint_limits']['over'] * c
        out[k] = (cap, low, high)
    return out


def team_workload(counts, days, alloc_tl=None, settings_tl=None, resolver=None):
    """
    Classify a team over sprints judged on `days` (empty = today).
    settings_tl / resolver: pass them when calling repeatedly to avoid reloading per call.
    Returns ({key: classify_workload result}, {key: level today}).
    """
    from django.utils import timezone

    today = timezone.localdate()
    days = list(days) or [today]
    if settings_tl is None:
        settings_tl = settings_timeline()
    levels = level_timelines(counts, resolver)
    capacity = member_capacity([k for k, c in counts.items() if c > 0], days, settings_tl, levels, alloc_tl)
    result = classify_workload(counts, capacity, len(days), get_workload_settings(today, settings_tl))
    return result, {k: level_on(t, today) for k, t in levels.items()}


def classify_workload(counts, capacity, sprint_count, settings):
    """
    counts: {key: item_count}; capacity: {key: (capacity, ideal_low, ideal_high)} from member_capacity;
    settings: the current settings (percentile gate only).
    Returns {key: {'percentile', 'status', 'effective_load', 'capacity', 'ideal_min', 'ideal_max'}}
    for keys with at least one item; 'capacity' is per sprint.
    """
    sprints = max(sprint_count, 1)
    loads = {k: c / capacity[k][0] for k, c in counts.items() if c > 0}
    n = len(loads)
    ordered = sorted(loads.values())
    gate = settings['use_percentile'] and n >= settings['small_team_min']

    result = {}
    for k, load in loads.items():
        fewer = bisect_left(ordered, load)
        same = bisect_right(ordered, load) - fewer
        pct = (fewer + 0.5 * same) / n * 100
        cap, low, high = capacity[k]
        # Whole items; round first so 3 * 0.7 = 2.0999... doesn't become 3 by float noise.
        ideal_min = ceil(round(low, 6))
        overload_from = max(ceil(round(high, 6)), ideal_min + 1)
        items = counts[k]
        if items >= overload_from and (not gate or pct > settings['overload_percentile']):
            status = 'Overloaded'
        elif items < ideal_min and (not gate or pct <= settings['underutil_percentile']):
            status = 'Underutilised'
        else:
            status = 'Balanced'
        result[k] = {
            'percentile': round(pct, 2), 'status': status, 'effective_load': round(load, 2),
            'capacity': round(cap / sprints, 2), 'ideal_min': ideal_min, 'ideal_max': overload_from - 1,
        }
    return result


def workload_warnings(project_id=None):
    """
    Setup gaps that make the workload screen less accurate, as [{'code', 'message'}] for a banner.
    Members = active portal users assigned in the latest started sprint (of the project, or of every project).
    """
    from calendar import month_name
    from django.utils import timezone
    from configuration.models import SourceConfiguration
    from data.models import WorkItem
    from django.db import connection
    from users.models import ResourceAllocation, User, UserLevelHistory

    warnings = []
    today = timezone.localdate()
    timeline = settings_timeline()
    settings = get_workload_settings(today, timeline)

    if not timeline:
        warnings.append({'code': 'settings_not_set', 'message': (
            'Workload settings are not set in Company Baseline, so default level weights and Min/Max limits '
            'are used. Please update them from Company Baseline.')})

    month_label = f'{month_name[today.month]} {today.year}'
    # This tenant's (or project's) sheet; MonthlyAllocationStatus is global across tenants, so not used.
    published = ResourceAllocation.objects.filter(month=today.month, year=today.year, status='PUBLISHED')
    published = published.filter(project_id=project_id) if project_id else published.filter(
        project__tenant_id=getattr(connection.tenant, 'id', None))
    if settings['use_allocation'] and not published.exists():
        warnings.append({'code': 'allocation_not_published', 'message': (
            f'Allocation sheet for {month_label} is not completed. Workload may be affected. '
            'Please complete and publish it from Resource Allocation.')})

    sprint_ids = latest_sprint_ids_per_project()
    items = WorkItem.objects.filter(sprint_id__in=sprint_ids)
    if project_id:
        items = items.filter(
            source_config_id__in=SourceConfiguration.objects.filter(project_id=project_id).values('id')
        )
    if not items.exists():
        warnings.append({'code': 'no_sprint_data', 'message': (
            'No sprint data found for the current sprint. Please check the project sync.')})
        return warnings

    members = list(
        User.objects.filter(id__in=items.filter(resolved_assignee__is_active=True).values('resolved_assignee_id'))
        .order_by('first_name', 'last_name')
    )

    def names(users):
        shown = ', '.join((u.get_full_name() or u.email) for u in users[:5])
        return shown + (f' and {len(users) - 5} more' if len(users) > 5 else '')

    with_level = set(UserLevelHistory.objects.filter(user__in=members).values_list('user_id', flat=True))
    no_level = [u for u in members if u.id not in with_level]
    if no_level:
        warnings.append({'code': 'level_not_set', 'message': (
            f'Level is not set for {len(no_level)} employee(s): {names(no_level)}. They are counted as Mid. '
            'Please set it from Users.')})

    if project_id and settings['use_allocation']:
        # This month's sheet only; an unpublished month is already reported above.
        allocation = dict(allocation_timeline(project_id)).get((today.year, today.month), {})
        no_alloc = [u for u in members if u.email.lower() not in allocation]
        if allocation and no_alloc:
            warnings.append({'code': 'allocation_not_set', 'message': (
                f'No {month_label} allocation for this project for {len(no_alloc)} employee(s): {names(no_alloc)}. '
                'They are counted at 100%. Please update it from Resource Allocation.')})
    return warnings
