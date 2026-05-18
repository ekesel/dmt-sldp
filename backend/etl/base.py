from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Callable
import logging

logger = logging.getLogger(__name__)

# Sub-task names containing these words indicate a "role node" (Pattern C)
_ROLE_KEYWORDS = frozenset([
    'backend', 'back end', 'back-end', 'be', 'api', 'server', 'service',
    'frontend', 'front end', 'front-end', 'fe', 'ui', 'ux', 'web', 'mobile',
    'ios', 'android', 'react', 'flutter', 'qa', 'quality assurance', 'quality assurance engineer'
])


class BaseConnector(ABC):
    """
    Abstract base class for all source connectors (Jira, ClickUp, ADO, etc.)
    """
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.base_url = config.get('base_url', '')
        self.api_key = config.get('api_token', '') or config.get('api_key', '')
        self.username = config.get('username', '')

        from data.analytics.identity_resolver import IdentityResolver
        self.identity_resolver = IdentityResolver()
        self.identity_resolver.load()

    @abstractmethod
    def test_connection(self) -> bool:
        """
        Validate credentials and connectivity.
        Returns True if successful, raises Exception if failed.
        """
        pass

    def fetch_folders(self) -> List[Dict[str, str]]:
        """
        Fetch available scope folders (e.g. ClickUp Folders, ADO Teams).
        Returns a list of dicts: [{'id': '...', 'name': '...'}]
        Defaults to empty list if not implemented.
        """
        return []

    @abstractmethod
    def sync(self, tenant_id: int, source_id: int, progress_callback: Optional[Callable[[int, str], None]] = None) -> Dict[str, Any]:
        """
        Perform full sync of data.
        Should return stats dict: {'items_synced': int, 'prs_synced': int}
        """
        pass

    def normalize_status(self, raw_status: str) -> str:
        """
        Map external status to DMT status categories ('todo', 'in_progress', 'done').
        Override this in subclasses for specific mapping logic.
        """
        status = raw_status.lower()
        if status in ['done', 'complete', 'closed', 'resolved', 'verified']:
            return 'done'
        elif status in ['in progress', 'active', 'development', 'review']:
            return 'in_progress'
        return 'todo'

    # ─── Violation History ────────────────────────────────────────────────────

    def _track_violation_history(
        self,
        source_id: int,
        external_id: str,
        new_compliant: bool,
        new_failures: list,
    ) -> dict:
        """
        Compare the incoming compliance result against the stored record and
        maintain a chronological violation history.  Returns a dict of fields
        to merge into the WorkItem update_or_create defaults.
        """
        from data.models import WorkItem
        from django.utils import timezone

        now = timezone.now()

        try:
            existing = WorkItem.objects.get(source_config_id=source_id, external_id=external_id)
        except WorkItem.DoesNotExist:
            # Brand-new item
            history = []
            if not new_compliant:
                history = [{'failures': list(new_failures), 'detected_at': now.isoformat(), 'cleared_at': None}]
            return {
                'violation_history': history,
                'had_violations': bool(history),
                'violations_cleared_at': None,
            }

        history = list(existing.violation_history or [])
        had_violations = existing.had_violations
        violations_cleared_at = existing.violations_cleared_at
        prev_compliant = existing.dmt_compliant  # may be None on very first sync

        if prev_compliant is None:
            # First time we have a definitive result
            if not new_compliant:
                history.append({'failures': list(new_failures), 'detected_at': now.isoformat(), 'cleared_at': None})
                had_violations = True

        elif prev_compliant and not new_compliant:
            # Regression: was clean, now failing
            history.append({'failures': list(new_failures), 'detected_at': now.isoformat(), 'cleared_at': None})
            had_violations = True

        elif not prev_compliant and new_compliant:
            # Fixed: close the most recent open entry
            if history and history[-1].get('cleared_at') is None:
                history[-1]['cleared_at'] = now.isoformat()
            violations_cleared_at = now
            had_violations = True  # permanently set; cleared ≠ never happened

        elif not prev_compliant and not new_compliant:
            # Still failing: keep the open entry but refresh the failure list
            if history and history[-1].get('cleared_at') is None:
                history[-1]['failures'] = list(new_failures)

        return {
            'violation_history': history,
            'had_violations': had_violations,
            'violations_cleared_at': violations_cleared_at,
        }

    # ─── Post-sync Attribution ────────────────────────────────────────────────

    def _post_sync_attribution(self, source_id: int):
        """
        After all items are synced and parent links are resolved, walk every
        root-level work item and:

          Pattern A – flat single assignee (nothing extra needed).
          Pattern B – sub-tasks carry assignees / SPs; bubble up.
          Pattern C – backend/frontend role sub-tasks each with their own
                      leaf sub-sub-tasks; two-level bubble.
          Pattern D – multiple raw assignees on the story itself; split SP.

        Also re-runs ComplianceEngine on any parent whose DMT fields were
        updated from sub-task data.
        """
        from data.models import WorkItem
        from etl.transformers import ComplianceEngine

        root_items = WorkItem.objects.filter(
            source_config_id=source_id,
            parent__isnull=True,
            deleted_at__isnull=True,
        ).prefetch_related('subtasks')

        for item in root_items:
            children = [c for c in item.subtasks.all() if not c.deleted_at]

            # ── Pattern D: multiple raw assignees on the story itself ──────────
            raw_assignees = (item.raw_source_data or {}).get('assignees', [])
            if len(raw_assignees) > 1 and not children:
                sp_each = round((item.story_points or 0) / len(raw_assignees), 2)
                contributions = []
                for a in raw_assignees:
                    email = self.identity_resolver.resolve(a.get('email'))
                    if email:
                        contributions.append({
                            'email': email,
                            'name': a.get('username') or a.get('name') or email,
                            'story_points': sp_each,
                            'role': 'developer',
                        })
                if contributions:
                    item.assignee_contributions = contributions
                    item.dmt_fields_source = 'self'
                    item.save(update_fields=['assignee_contributions', 'dmt_fields_source'])
                continue

            if not children:
                # Pattern A: clear any stale attribution from a previous sync
                if item.assignee_contributions or item.dmt_fields_source:
                    item.assignee_contributions = []
                    item.dmt_fields_source = ''
                    item.save(update_fields=['assignee_contributions', 'dmt_fields_source'])
                continue

            # ── Detect Pattern C: role-named children that themselves have children ──
            role_nodes = [c for c in children if self._is_role_node(c)]
            role_nodes_with_leaves = [
                c for c in role_nodes
                if c.subtasks.filter(deleted_at__isnull=True).exists()
            ]

            if role_nodes_with_leaves:
                # Pattern C: collect contributions from leaf sub-sub-tasks
                leaf_items = []
                for role_node in role_nodes_with_leaves:
                    role = self._extract_role(role_node)
                    leaves = list(role_node.subtasks.filter(deleted_at__isnull=True))
                    for leaf in leaves:
                        leaf._role_hint = role  # transient annotation
                    leaf_items.extend(leaves)
                    # Also include the role node itself for DMT field bubbling
                    # (PR links, ac_quality etc. are often set on the role node, not its leaves)
                    # _sp_override=0 prevents double-counting SP already on the leaves
                    role_node._role_hint = role
                    role_node._sp_override = 0
                    leaf_items.append(role_node)
                # Also include role nodes that have NO children (act as their own leaf)
                for role_node in role_nodes:
                    if role_node not in role_nodes_with_leaves:
                        role_node._role_hint = self._extract_role(role_node)
                        leaf_items.append(role_node)

                contributions, dmt_updates = self._collect_from_leaves(leaf_items, use_sp_override=True)
                self._apply_to_item(item, contributions, dmt_updates, 'sub_subtask')

            else:
                # ── Pattern B: direct sub-tasks carry assignees / SPs ──────────
                children_with_assignees = [c for c in children if c.assignee_email]
                if not children_with_assignees:
                    continue

                total_subtask_sp = sum(c.story_points or 0 for c in children_with_assignees)
                fallback_sp = round(
                    (item.story_points or 0) / max(len(children_with_assignees), 1), 2
                ) if not total_subtask_sp else 0

                for c in children_with_assignees:
                    c._role_hint = 'developer'
                    c._sp_override = c.story_points if c.story_points else fallback_sp

                contributions, dmt_updates = self._collect_from_leaves(
                    children_with_assignees, use_sp_override=True
                )
                self._apply_to_item(item, contributions, dmt_updates, 'subtask')

    @staticmethod
    def _extract_person_field(val):
        """
        Normalise a PM tool person/text field value into (name, raw_email).
        Handles ClickUp people arrays, Jira accountId dicts, ADO identity objects, and plain strings.
        Returns (name_str_or_None, email_str_or_None).
        """
        if not val:
            return None, None
        if isinstance(val, list) and val:
            val = val[0]
        if isinstance(val, dict):
            name = (val.get('username') or val.get('displayName') or
                    val.get('name') or val.get('fullName') or '')
            email = (val.get('email') or val.get('emailAddress') or
                     val.get('uniqueName') or '')
            return name or None, email or None
        raw = str(val).strip()
        # If it looks like an email, use as both
        if '@' in raw:
            return raw, raw
        return raw or None, None

    def _is_role_node(self, item) -> bool:
        """True if this item's title contains a role keyword."""
        title = (item.title or '').lower()
        return any(kw in title for kw in _ROLE_KEYWORDS)

    def _extract_role(self, item) -> str:
        """Extract a role label from a role node's title."""
        title = (item.title or '').lower()
        for kw in ('backend', 'back end', 'back-end', 'be', 'api', 'server', 'service'):
            if kw in title:
                return 'backend'
        for kw in ('frontend', 'front end', 'front-end', 'fe', 'ui', 'ux', 'web',
                   'mobile', 'ios', 'android', 'react', 'flutter'):
            if kw in title:
                return 'frontend'
        return 'developer'

    def _collect_from_leaves(
        self,
        leaf_items: list,
        use_sp_override: bool = False,
    ):
        """
        Aggregate assignee contributions and DMT fields from a list of leaf items.
        Returns (contributions_list, dmt_updates_dict).
        """
        contributions: Dict[str, dict] = {}
        pr_links: list = []
        ac_quality = None
        reviewer_dmt_signoff = False
        unit_testing_statuses: list = []

        for leaf in leaf_items:
            email = leaf.assignee_email
            if email:
                if use_sp_override:
                    sp = getattr(leaf, '_sp_override', leaf.story_points or 0)
                else:
                    sp = leaf.story_points or 0

                role = getattr(leaf, '_role_hint', 'developer')

                if email in contributions:
                    contributions[email]['story_points'] = round(
                        contributions[email]['story_points'] + sp, 2
                    )
                else:
                    contributions[email] = {
                        'email': email,
                        'name': leaf.assignee_name or email,
                        'story_points': sp,
                        'role': role,
                    }

            if leaf.pr_links:
                pr_links.extend(leaf.pr_links)
            if leaf.ac_quality and not ac_quality:
                ac_quality = leaf.ac_quality
            if leaf.reviewer_dmt_signoff:
                reviewer_dmt_signoff = True
            if leaf.unit_testing_status:
                unit_testing_statuses.append(leaf.unit_testing_status)

        dmt_updates: Dict[str, Any] = {}
        if pr_links:
            dmt_updates['pr_links'] = list(dict.fromkeys(pr_links))  # deduplicate, preserve order
        if ac_quality:
            dmt_updates['ac_quality'] = ac_quality
        if reviewer_dmt_signoff:
            dmt_updates['reviewer_dmt_signoff'] = True
        if unit_testing_statuses:
            priority = ['done', 'exception_approved', 'in_progress', 'not_started']
            for p in priority:
                if p in unit_testing_statuses:
                    dmt_updates['unit_testing_status'] = p
                    break

        return list(contributions.values()), dmt_updates

    def _apply_to_item(self, item, contributions: list, dmt_updates: dict, source: str):
        """
        Write contributions and bubbled DMT fields onto a root WorkItem and
        re-run compliance if anything changed.
        """
        from etl.transformers import ComplianceEngine

        if not contributions and not dmt_updates:
            return

        changed_fields = []

        # Always overwrite contributions to clear stale data from previous syncs
        item.assignee_contributions = contributions
        item.dmt_fields_source = source if contributions else ''
        changed_fields += ['assignee_contributions', 'dmt_fields_source']

        if contributions:
            # Infer/update primary assignee if none from source or previously inferred
            if not item.assignee_email or item.inferred_assignee:
                primary = max(contributions, key=lambda c: c.get('story_points', 0))
                item.assignee_email = primary['email']
                item.assignee_name = primary['name']
                item.inferred_assignee = True
                changed_fields += ['assignee_email', 'assignee_name', 'inferred_assignee']

        dmt_changed = False
        for field, value in dmt_updates.items():
            if getattr(item, field, None) != value:
                setattr(item, field, value)
                changed_fields.append(field)
                dmt_changed = True

        if dmt_changed:
            # Re-evaluate compliance with the updated DMT fields
            item_data = {
                'parent': item.parent_id,
                'item_type': item.item_type,
                'status': item.status,
                'status_category': item.status_category,
                'ac_quality': item.ac_quality,
                'unit_testing_status': item.unit_testing_status,
                'pr_links': item.pr_links,
                'reviewer_dmt_signoff': item.reviewer_dmt_signoff,
            }
            is_compliant, failures = ComplianceEngine.check_compliance(item_data)
            item.dmt_compliant = is_compliant
            item.compliance_failures = failures
            changed_fields += ['dmt_compliant', 'compliance_failures']

        if changed_fields:
            item.save(update_fields=list(set(changed_fields)))
