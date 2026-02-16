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
    """
    @staticmethod
    def check_compliance(work_item_data: Dict[str, Any]) -> tuple[bool, List[str]]:
        failures = []
        
        # 1. Basic Metadata
        if not work_item_data.get('assignee_email'):
            failures.append('missing_assignee')
        if not work_item_data.get('description'):
            failures.append('missing_description')
            
        # 2. DMT Specific
        if not work_item_data.get('pr_links'):
            failures.append('missing_pr_link')
            
        # 3. Quality Gates
        ac_quality = work_item_data.get('ac_quality')
        if not ac_quality or ac_quality == 'incomplete':
            failures.append('ac_quality_insufficient')
            
        coverage = work_item_data.get('coverage_percent')
        if coverage is not None and coverage < 80: # Default threshold
            failures.append('low_test_coverage')
            
        is_compliant = len(failures) == 0
        return is_compliant, failures
