"""
Capacity-based workload status (Team Workload card + Individual workload).

capacity    = seniority_weight * allocation   (share of time on the project: the sprint month's published %,
              else the person's nearest published month, else 1.0)
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
    """
    WorkItem queryset narrowed to what counts as workload: never epics, sub-tasks only if enabled, and never
    items closed without being done (Closed / duplicate / not a bug / invalid / won't fix: no work happened).
    """
    from django.db.models import Q
    from data.analytics.metrics import NOT_FIXED_BUG_STATUSES

    # ponytail: 'Closed' read as "dropped" everywhere; OCS Sprint 1-2 used it as done (see counted_done),
    # move to a per-source status setting if old sprints must count.
    qs = qs.exclude(item_type='epic').exclude(Q(status_category='done') & NOT_FIXED_BUG_STATUSES)
    if not settings['count_subtasks']:
        qs = qs.filter(Q(parent__isnull=True) | Q(parent__item_type='epic'))
    return qs


def co_assigned(qs):
    """Items with 2+ assignees on the item itself (ClickUp raw `assignees`), annotated `co_assignees`."""
    from django.db.models.fields.json import KeyTransform

    return qs.filter(raw_source_data__assignees__1__isnull=False).annotate(
        co_assignees=KeyTransform('assignees', 'raw_source_data'),
    )


def with_carried_over(sprint_ids):
    """
    Q for the items of these sprints plus unfinished Jira issues that passed through one of them and were
    carried over to a later sprint (an issue is stored in its latest sprint only; Jira lists every sprint).
    """
    import re
    from django.db.models import Q
    from data.models import Sprint, WorkItem

    sprint_ids = list(sprint_ids)
    jira = dict(
        Sprint.objects.filter(id__in=sprint_ids, external_id__startswith='jira_sprint_')
        .values_list('external_id', 'source_config_id')
    )
    window = {ext.rsplit('_', 1)[-1] for ext in jira}
    carried = []
    if window:
        # ponytail: scans open issues of these sources in Python (the sprint field id differs per Jira site);
        # store every sprint of an issue if this gets slow.
        open_items = (
            WorkItem.objects.filter(source_config_id__in=set(jira.values()), sprint__isnull=False)
            .exclude(sprint_id__in=sprint_ids).exclude(status_category='done')
            .values_list('id', 'raw_source_data__fields')
        )
        for item_id, fields in open_items.iterator():
            for key, value in (fields or {}).items():
                if not key.startswith('customfield_') or not isinstance(value, list):
                    continue
                ids = set()
                for v in value:  # sprint field only: other list fields have ids too
                    if isinstance(v, dict) and ('boardId' in v or 'state' in v) and v.get('id') is not None:
                        ids.add(str(v['id']))
                    elif isinstance(v, str) and 'sprint' in v.lower():
                        ids.update(re.findall(r'id=(\d+)', v))
                if ids & window:
                    carried.append(item_id)
                    break
    return Q(sprint_id__in=sprint_ids) | Q(id__in=carried)


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


def window_sprints(project_id=None, sprint_ids=None, window=None):
    """
    {project id: [(sprint id, judging day), ...]} of the sprints the team card shows by default: the last
    `window` completed sprints of the project (All Projects: of every project still running sprints), or the
    picked sprint_ids.
    """
    from django.db.models import F, Q
    from django.utils import timezone
    from configuration.models import SourceConfiguration
    from data.models import Sprint

    window = window or get_workload_settings()['sprint_window']
    now = timezone.now()
    qs = Sprint.objects.all()
    if project_id:
        qs = qs.filter(source_config_id__in=SourceConfiguration.objects.filter(project_id=project_id).values('id'))
    if sprint_ids:
        qs = qs.filter(id__in=sprint_ids)  # a picked running sprint counts, as on the card
    else:
        qs = qs.filter(end_date__lt=now)  # completed only, same as the team card and KPI cards
    if not sprint_ids and not project_id:
        # Same cut-off as the team card: projects that stopped running sprints are left out.
        cutoff = now - timezone.timedelta(days=window * 14)
        qs = qs.filter(Q(end_date__gte=cutoff) | Q(end_date__isnull=True, start_date__gte=cutoff))
    rows = list(
        qs.order_by(F('end_date').desc(nulls_last=True), F('start_date').desc(nulls_last=True))
        .values_list('id', 'source_config_id', 'start_date', 'end_date')
    )
    project_of = dict(SourceConfiguration.objects.filter(id__in={r[1] for r in rows}).values_list('id', 'project_id'))
    out = {}
    for sprint_id, src, start, end in rows:
        pid = project_of.get(src)
        if pid is not None and (sprint_ids or len(out.get(pid, [])) < window):
            out.setdefault(pid, []).append((sprint_id, sprint_day(start, end)))
    return out


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


def allocation_for(timeline, key, day, earlier_only=False):
    """
    key's share in `day`'s month: their latest published month on or before it, else (unless earlier_only)
    their first month after (joined later); None if never allocated to the project.
    Left the project = later sheets were published without them and they never come back: None.
    A gap (missing from one month, back later) keeps the earlier share.
    """
    own = [(month, alloc) for month, alloc in ((m, mp.get(key)) for m, mp in timeline) if alloc]
    if not own:
        return None
    month = (day.year, day.month)
    share = _as_of(own, month)
    last = own[-1][0]
    if share and last < month and any(last < m <= month for m, _ in timeline):
        return None
    if share or earlier_only:
        return share
    return own[0][1]


def member_allocations(keys, day, timelines=None):
    """
    {key: [{'project_id', 'project', 'percent'}, ...]}: the share on every project of this tenant in `day`'s
    month (nearest published month, as the capacity uses it), largest first.
    timelines: {project id: allocation_timeline} already loaded, reused instead of reloading.
    """
    from django.db import connection
    from configuration.models import Project
    from users.models import ResourceAllocation

    project_ids = set(
        ResourceAllocation.objects.filter(
            status='PUBLISHED', percentage_allocated__gt=0, project__tenant__schema_name=connection.schema_name,
        ).values_list('project_id', flat=True)
    )
    names = dict(Project.objects.filter(id__in=project_ids).values_list('id', 'name'))
    out = {k: [] for k in keys}
    timelines = timelines or {}
    for pid in project_ids:
        tl = timelines[pid] if pid in timelines else allocation_timeline(pid)
        for k in keys:
            share = allocation_for(tl, k, day)
            if share:
                out[k].append({'project_id': pid, 'project': names.get(pid, str(pid)), 'percent': round(share * 100)})
    for rows in out.values():
        rows.sort(key=lambda a: (-a['percent'], a['project']))
    return out


def allocation_gaps(parts):
    """
    parts: [(project_id, project name, keys, days, allocation_timeline)].
    {key: [{'project_id', 'project', 'month': 'YYYY-MM'}]}: months of the viewed sprints whose sheet is published
    for that project but has no share for the person (0% or not listed).
    """
    out = {}
    for pid, name, keys, days, tl in parts:
        by_month = dict(tl or [])
        for month in sorted({(d.year, d.month) for d in days}):
            sheet = by_month.get(month)
            if not sheet:
                continue  # month not published: reported as an unpublished sheet instead
            for k in keys:
                if not sheet.get(k):
                    out.setdefault(k, []).append({'project_id': pid, 'project': name, 'month': f'{month[0]}-{month[1]:02d}'})
    return out


def month_label(month):
    """'2026-10' -> 'Oct 2026'."""
    from calendar import month_abbr
    year, mon = month.split('-')
    return f'{month_abbr[int(mon)]} {year}'


def gaps_text(gaps):
    """'Oct 2026 (OCS), Sep 2026 (DMT)'."""
    return ', '.join(f"{month_label(g['month'])} ({g['project']})" for g in gaps)


def workload_note(items, ideal_min, ideal_max, sprints):
    """Tooltip line 1, e.g. 'Ideal 5–9 tasks · has 10'."""
    span = f' in {sprints} sprints' if sprints > 1 else ''
    return f'Ideal {ideal_min}–{ideal_max} tasks{span} · has {items}'


def allocation_note(allocations, unset_project=None, gaps=None):
    """
    Tooltip line 2, e.g. 'OCS 80% · DMT 10% · 10% unallocated · No allocation in Oct 2026 (OCS)'.
    unset_project: name of the viewed project when the person has no allocation there (counted at 100%).
    gaps: allocation_gaps rows (viewed sprint months without a share).
    """
    note = _allocation_text(allocations, unset_project)
    if gaps:
        note += f' · No allocation in {gaps_text(gaps)}'
    return note


def _allocation_text(allocations, unset_project):
    if not allocations:
        return f'{unset_project} not set (counted at 100%)' if unset_project else 'No allocation set (counted at 100%)'
    parts = [f"{a['project']} {a['percent']}%" for a in allocations]
    if unset_project:
        parts.insert(0, f'{unset_project} not set (counted at 100%)')
    total = sum(a['percent'] for a in allocations)
    if total < 100:
        parts.append(f'{100 - total}% unallocated')
    elif total > 100:
        parts.append(f'{total}% allocated')
    return ' · '.join(parts)


def member_capacity(keys, days, settings_tl, levels, alloc_tl=None):
    """
    {key: (capacity, ideal_low, ideal_high)} summed over the sprints, one judging `day` each: every sprint
    uses the level, weights, limits and allocation in effect on its day. alloc_tl None = allocation not used.
    """
    per_day = [(day, get_workload_settings(day, settings_tl)) for day in days]
    out = {}
    for k in keys:
        cap = low = high = 0.0
        for day, s in per_day:
            alloc = 1.0
            if alloc_tl is not None and s['use_allocation']:
                alloc = allocation_for(alloc_tl, k, day) or 1.0  # never allocated to the project = 100%
            alloc = min(max(alloc, s['min_allocation'] / 100), 1.0)
            c = (s['seniority_weights'].get(level_on(levels.get(k), day) or 'mid') or 1.0) * alloc
            cap += c
            low += s['per_sprint_limits']['under'] * c
            high += s['per_sprint_limits']['over'] * c
        out[k] = (cap, low, high)
    return out


def team_workload(counts, days, alloc_tl=None, settings_tl=None, resolver=None, parts=None):
    """
    Classify a team over sprints judged on `days` (empty = today).
    parts: [(keys, days, alloc_tl), ...] for a team spread over several projects (All Projects): each member's
    capacity is summed over the projects they have items in, each with that project's sprints and allocation;
    `days` / `alloc_tl` are then unused.
    settings_tl / resolver: pass them when calling repeatedly to avoid reloading per call.
    Returns ({key: classify_workload result}, {key: level today}).
    """
    from django.utils import timezone

    today = timezone.localdate()
    active = [k for k, c in counts.items() if c > 0]
    if settings_tl is None:
        settings_tl = settings_timeline()
    if parts is None:
        parts = [(active, days, alloc_tl)]
    elif get_workload_settings(today, settings_tl)['use_allocation']:
        # All Projects: a project someone was never allocated to adds no capacity when another project has
        # them allocated (its items still count). Allocated nowhere = every project at 100%.
        allocated = [{k for k in keys if allocation_for(tl or [], k, today)} for keys, _, tl in parts]
        anywhere = set().union(*allocated)
        parts = [
            ([k for k in keys if k in known or k not in anywhere], part_days, tl)
            for (keys, part_days, tl), known in zip(parts, allocated)
        ]
    levels = level_timelines(counts, resolver)
    capacity = {}
    for keys, part_days, part_alloc in parts:
        part_keys = [k for k in keys if counts.get(k, 0) > 0]
        for k, (cap, low, high) in member_capacity(part_keys, list(part_days) or [today], settings_tl, levels, part_alloc).items():
            prev = capacity.get(k, (0.0, 0.0, 0.0))
            capacity[k] = (prev[0] + cap, prev[1] + low, prev[2] + high)
    missing = [k for k in active if k not in capacity]
    if missing:  # items outside every part: judge them on today at 100%
        capacity.update(member_capacity(missing, [today], settings_tl, levels))
    sprint_count = max((len(part_days) for _, part_days, _ in parts), default=0) or 1
    result = classify_workload(counts, capacity, sprint_count, get_workload_settings(today, settings_tl))
    return result, {k: level_on(t, today) for k, t in levels.items()}


def ideal_range(low, high):
    """
    Whole-item ideal range (min, max) for raw limits low = Min x capacity, high = Max x capacity:
    min = ceil(low), Overloaded from ceil(high) (at least min + 1), so max = that - 1.
    Rounds first so 3 * 0.7 = 2.0999... doesn't become 3 by float noise.
    """
    ideal_min = ceil(round(low, 6))
    return ideal_min, max(ceil(round(high, 6)), ideal_min + 1) - 1


def level_ranges(settings):
    """{level: {'min', 'max'}} ideal tasks per sprint at 100% allocation (Company Baseline preview)."""
    limits = settings['per_sprint_limits']
    return {
        level: dict(zip(('min', 'max'), ideal_range(limits['under'] * w, limits['over'] * w)))
        for level, w in settings['seniority_weights'].items()
    }


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
        ideal_min, ideal_max = ideal_range(low, high)
        overload_from = ideal_max + 1
        items = counts[k]
        if items >= overload_from and (not gate or pct > settings['overload_percentile']):
            status = 'Overloaded'
        elif items < ideal_min and (not gate or pct <= settings['underutil_percentile']):
            status = 'Underutilised'
        else:
            status = 'Balanced'
        result[k] = {
            'percentile': round(pct, 2), 'status': status, 'effective_load': round(load, 2),
            'capacity': round(cap / sprints, 2), 'ideal_min': ideal_min, 'ideal_max': ideal_max,
        }
    return result


def workload_warnings(project_id=None, sprint_ids=None):
    """
    Setup gaps that make the workload screen less accurate, as [{'code', 'message'}] for a banner.
    Members = active portal users assigned in the latest started sprint (of the project, or of every project).
    Allocation gaps cover the months of the sprints the team card shows (sprint_ids, else its default window).
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

    this_month = f'{month_name[today.month]} {today.year}'
    # This tenant's (or project's) sheet; MonthlyAllocationStatus is global across tenants, so not used.
    published = ResourceAllocation.objects.filter(month=today.month, year=today.year, status='PUBLISHED')
    published = published.filter(project_id=project_id) if project_id else published.filter(
        project__tenant__schema_name=connection.schema_name)
    if settings['use_allocation'] and not published.exists():
        warnings.append({'code': 'allocation_not_published', 'message': (
            f'Allocation sheet for {this_month} is not completed. Workload may be affected. '
            'Please complete and publish it from Resource Allocation.')})

    latest_ids = latest_sprint_ids_per_project()
    items = WorkItem.objects.filter(sprint_id__in=latest_ids)
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

    if settings['use_allocation']:
        # Viewed sprints' months (not just this one): a published sheet without the person's share.
        from configuration.models import Project
        windows = window_sprints(project_id, sprint_ids, settings['sprint_window'])
        names_of = dict(Project.objects.filter(id__in=windows).values_list('id', 'name'))
        gap_parts = []
        for pid, rows in windows.items():
            users = (
                WorkItem.objects.filter(sprint_id__in=[sid for sid, _ in rows], resolved_assignee__is_active=True)
                .values_list('resolved_assignee__email', flat=True).distinct()
            )
            keys = [e.lower() for e in users if e]
            gap_parts.append((pid, names_of.get(pid, str(pid)), keys, [d for _, d in rows], allocation_timeline(pid)))
        gaps = allocation_gaps(gap_parts)
        people = []
        if gaps:
            from django.db.models.functions import Lower
            people = list(
                User.objects.annotate(email_l=Lower('email')).filter(email_l__in=list(gaps))
                .order_by('first_name', 'last_name')
            )
        if people:
            shown = '; '.join(f'{u.get_full_name() or u.email} ({gaps_text(gaps[u.email.lower()])})' for u in people[:5])
            more = f' and {len(people) - 5} more' if len(people) > 5 else ''
            warnings.append({'code': 'allocation_not_set', 'message': (
                f'No allocation in the viewed sprints for {len(people)} employee(s): {shown}{more}. '
                'Their nearest allocated month is used, else 100%. Please update it from Resource Allocation.')})
    if not project_id and settings['use_allocation']:
        # All Projects: items on a project the person was never allocated to add no capacity (see team_workload).
        project_of = dict(SourceConfiguration.objects.values_list('id', 'project_id'))
        worked = {
            (user_id, project_of.get(src))
            for user_id, src in items.filter(resolved_assignee__in=members)
            .values_list('resolved_assignee_id', 'source_config_id').distinct()
        }
        allocated = set(
            ResourceAllocation.objects.filter(status='PUBLISHED', percentage_allocated__gt=0, developer__in=members)
            .values_list('developer_id', 'project_id')
        )
        allocated_users = {user_id for user_id, _ in allocated}
        gaps = {user_id for user_id, proj in worked if user_id in allocated_users and (user_id, proj) not in allocated}
        no_alloc = [u for u in members if u.id in gaps]
        if no_alloc:
            warnings.append({'code': 'allocation_missing_project', 'message': (
                f'{len(no_alloc)} employee(s) have items on a project they are not allocated to: {names(no_alloc)}. '
                'That project adds no capacity for them in All Projects. Please update it from Resource Allocation.')})
    return warnings
