from ..models import WorkItem

class ComplianceEngine:
    """
    Engine to evaluate WorkItem compliance based on defined quality rules.
    """
    def check_compliance(self, work_item: WorkItem):
        failures = []
        
        # Rule 1: Must have at least one linked Pull Request
        prs = work_item.pull_requests.all()
        if not prs.exists():
            failures.append("missing_pr")
            
        # Rule 2: At least one PR must be merged (Solidification)
        if prs.exists() and not prs.filter(status='merged').exists():
            failures.append("missing_merged_pr")

        # Rule 3: CI/CD Signal Check
        if prs.exists():
            from ..models import PullRequestStatus
            failing_statuses = PullRequestStatus.objects.filter(
                pull_request__in=prs,
                state__in=['failure', 'error']
            )
            if failing_statuses.exists():
                failures.append("failing_ci_checks")
            
        work_item.is_compliant = len(failures) == 0
        work_item.compliance_reason = {
            "failures": failures,
            "checked_at": str(work_item.updated_at)
        }
        work_item.save()
        
        return work_item.is_compliant
