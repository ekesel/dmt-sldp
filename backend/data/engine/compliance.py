from ..models import WorkItem

class ComplianceEngine:
    """
    Engine to evaluate WorkItem compliance based on defined quality rules.
    """
    def check_compliance(self, work_item: WorkItem):
        failures = []
        
        # Rule 1: Must have at least one linked Pull Request
        pr_count = work_item.pull_requests.count()
        if pr_count == 0:
            failures.append("missing_pr")
            
        # Rule 2: Must be in a terminal status if PRs exist
        # (This is a simplified rule for the v1.1 foundation)
        
        work_item.is_compliant = len(failures) == 0
        work_item.compliance_reason = {
            "failures": failures,
            "checked_at": str(work_item.updated_at)
        }
        work_item.save()
        
        return work_item.is_compliant
