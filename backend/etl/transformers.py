from typing import Dict, Any, List, Optional
from datetime import datetime
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class TaskHistoryParser:
    """
    Analyzes vendor-specific activity logs to find state transitions.
    """
    @staticmethod
    def extract_started_at(history: List[Dict[str, Any]], vendor: str) -> Optional[datetime]:
        """
        Find the first timestamp when an item moved to 'In Progress'.
        For Jira: Expects list of changelog histories.
        """
        if not history:
            return None
            
        if vendor == 'clickup':
            # ClickUp logic (placeholder if we use direct field, but keeping for future history support)
            for event in history:
                if event.get('type') == 'status_change':
                    after = event.get('after', {}).get('status', '').lower()
                    if after in ['in progress', 'active', 'developing']:
                        return TaskHistoryParser._parse_ts(event.get('date'), 'ms')
                        
        elif vendor == 'jira':
            # Jira changelog processing: histories -> items
            # Sort by created date just in case
            try:
                sorted_history = sorted(history, key=lambda x: x.get('created', ''))
            except:
                sorted_history = history

            for record in sorted_history:
                timestamp = record.get('created')
                for item in record.get('items', []):
                    if item.get('field') == 'status':
                        to_string = item.get('toString', '').lower()
                        if to_string in ['in progress', 'in_progress', 'active', 'development', 'developing']:
                            return TaskHistoryParser._parse_ts(timestamp, 'iso')
        
        return None

    @staticmethod
    def _parse_ts(val, unit='ms'):
        if not val: return None
        try:
            if unit == 'ms':
                return timezone.make_aware(datetime.fromtimestamp(int(val) / 1000))
            
            # Use Django's parser which handles more formats (e.g. Jira's +0000)
            from django.utils.dateparse import parse_datetime
            dt = parse_datetime(val)
            if dt and timezone.is_naive(dt):
                return timezone.make_aware(dt)
            return dt
        except:
            return None

class ComplianceEngine:
    """
    Automated rules for DMT compliance. Non-blocking.

    Graduated by status stage:
      backlog  → fully exempt (violations never raised)
      todo     → AC Quality only
      in_progress (basic) → AC Quality + PR link (stories/bugs)
      advanced (in review, ready for testing, testing, done) → full DMT check
    """

    # Items in any of these raw statuses are completely exempt.
    _BACKLOG_STATUSES: frozenset = frozenset(['backlog'])

    # Raw statuses that are "beyond basic in-progress" — testing/review phase or done.
    _ADVANCED_STATUSES: frozenset = frozenset([
        'in review', 'ready for testing', 'testing in progress', 'testing',
        'testing done', 'code review', 'qa', 'qa in progress', 'qa done',
        'reopened',
        # done variants
        'done', 'complete', 'closed', 'resolved', 'verified', 'completed', 'verified - dev',
    ])

    @staticmethod
    def check_compliance(work_item_data: Dict[str, Any], coverage_threshold: float = 80.0) -> tuple[bool, List[str]]:
        # Sub-tasks are exempt — DMT tracked at parent level only
        if work_item_data.get('parent'):
            return True, []

        raw_status = (work_item_data.get('status') or '').lower().strip()
        status_category = (work_item_data.get('status_category') or 'todo').lower()

        # Backlog items are fully exempt from DMT compliance
        if raw_status in ComplianceEngine._BACKLOG_STATUSES:
            return True, []

        # Determine effective stage
        is_advanced = (
            status_category == 'done'
            or raw_status in ComplianceEngine._ADVANCED_STATUSES
        )
        is_todo = status_category == 'todo'

        failures = []
        item_type = (work_item_data.get('item_type') or '').lower()
        unit_testing_status = work_item_data.get('unit_testing_status')
        has_exception = unit_testing_status == 'exception_approved'

        # Exception approved = blanket exemption from all DMT checks
        if has_exception:
            return True, []

        # ── Stage: TODO and beyond ───────────────────────────────────────────
        # AC Quality must be set the moment an item is picked up
        ac_quality = work_item_data.get('ac_quality')
        if not ac_quality or ac_quality == 'incomplete':
            failures.append('missing_ac_quality')

        if is_todo:
            # Only AC Quality checked at todo stage
            return len(failures) == 0, failures

        # ── Stage: Advanced (in review / testing / done) ─────────────────────
        if is_advanced:
            if item_type in ['story', 'bug']:
                pr_links = work_item_data.get('pr_links', [])
                valid_prs = [l for l in pr_links if isinstance(l, str) and l.startswith('http')]
                if not valid_prs:
                    failures.append('missing_pr_link')

            if unit_testing_status != 'done':
                failures.append('unit_testing_not_done')

            if item_type in ['story', 'bug']:
                if not work_item_data.get('reviewer_dmt_signoff'):
                    failures.append('missing_dmt_signoff')

        is_compliant = len(failures) == 0
        return is_compliant, failures
