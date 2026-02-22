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
    def check_compliance(work_item_data: Dict[str, Any], coverage_threshold: float = 80.0) -> tuple[bool, List[str]]:
        # If it's a subtask (has a parent), it is automatically exempt from DMT compliance checks
        if work_item_data.get('parent'):
            return True, []
            
        failures = []
        item_type = work_item_data.get('item_type', '').lower()
        unit_testing_status = work_item_data.get('unit_testing_status')
        has_exception = unit_testing_status == 'exception_approved'
        
        # 1. AC Quality
        ac_quality = work_item_data.get('ac_quality')
        if not ac_quality or ac_quality == 'incomplete':
            failures.append('missing_ac_quality')
            
        # 2. Unit Testing & Coverage
        if not has_exception:
            if unit_testing_status != 'done':
                failures.append('unit_testing_not_done')
            
            coverage = work_item_data.get('coverage_percent')
            if coverage is None or coverage < coverage_threshold:
                failures.append('low_coverage')
                
        # 3. Pull Request Requirements (Stories and Bugs)
        if item_type in ['story', 'bug']:
            pr_links = work_item_data.get('pr_links', [])
            valid_prs = [l for l in pr_links if isinstance(l, str) and l.startswith('http')]
            if not valid_prs:
                failures.append('missing_pr_link')
                
            # 4. CI Evidence & Signoff
            # ci_links = work_item_data.get('ci_evidence_links', [])
            # if not ci_links:
            #     failures.append('missing_ci_evidence')
                
            if not work_item_data.get('reviewer_dmt_signoff'):
                failures.append('missing_dmt_signoff')
            
        # 5. Basic Metadata (Supplemental)
        if not work_item_data.get('assignee_email'):
            failures.append('missing_assignee')
            
        is_compliant = len(failures) == 0
        return is_compliant, failures
