import logging
import datetime
from django.utils import timezone
from django.conf import settings
from celery import shared_task
from django_tenants.utils import schema_context
from .models import Tenant, AuditLog

logger = logging.getLogger(__name__)

@shared_task
def run_retention_policy_check():
    """
    Periodic task to enforce data retention policies for all active tenants.
    Deletes old data based on tenant-specific configuration.
    """
    logger.info("Starting global retention policy check...")
    
    # Iterate over all active tenants
    tenants = Tenant.objects.filter(status=Tenant.STATUS_ACTIVE)
    
    for tenant in tenants:
        logger.info(f"Processing retention for tenant: {tenant.name} ({tenant.schema_name})")
        
        try:
            with schema_context(tenant.schema_name):
                # 1. Resolve retention periods (in months)
                retention_wi_months = tenant.retention_work_items or 12
                retention_pr_months = tenant.retention_pull_requests or 12
                retention_ai_months = tenant.retention_ai_insights or 6
                
                # Calculate cutoff dates
                now = timezone.now()
                cutoff_wi = now - datetime.timedelta(days=retention_wi_months * 30)
                cutoff_pr = now - datetime.timedelta(days=retention_pr_months * 30)
                cutoff_ai = now - datetime.timedelta(days=retention_ai_months * 30)
                
                # Dynamic imports to avoid app registry issues if imported at top level during startup
                from data.models import WorkItem, PullRequest, AIInsight, Sprint
                
                # 2. Cleanup Work Items
                # Delete items resolved/closed before the cutoff
                # We use 'resolved_at' for completed items. Active items are ignored.
                deleted_wi_count = 0
                qs_wi = WorkItem.objects.filter(
                    status_category='done',
                    resolved_at__lt=cutoff_wi
                )
                if qs_wi.exists():
                    deleted_wi_count, _ = qs_wi.delete()
                    logger.info(f"[{tenant.schema_name}] Deleted {deleted_wi_count} old WorkItems.")

                # 3. Cleanup Sprints
                # Delete sprints that ended before the cutoff (using same retention as WorkItems)
                deleted_sprint_count = 0
                qs_sprint = Sprint.objects.filter(
                    end_date__lt=cutoff_wi
                )
                if qs_sprint.exists():
                    deleted_sprint_count, _ = qs_sprint.delete()
                    logger.info(f"[{tenant.schema_name}] Deleted {deleted_sprint_count} old Sprints.")

                # 4. Cleanup Pull Requests
                # Delete PRs merged or closed before the cutoff
                deleted_pr_count = 0
                # Merged PRs
                qs_pr_merged = PullRequest.objects.filter(
                    status='merged',
                    merged_at__lt=cutoff_pr
                )
                count_merged, _ = qs_pr_merged.delete()
                
                # Closed/Open PRs based on update time if no merge time (fallback for stale PRs)
                # Ideally check 'closed_at' but model only has updated_at. 
                # For safety, we only strictly delete 'merged' ones or based on created_at for very old ones?
                # PRD says "Pull Requests Retention". Let's assume created_at for non-merged to be safe?
                # Or just use updated_at for everything non-active?
                # Let's stick to: if updated_at < cutoff, it's stale/old.
                qs_pr_stale = PullRequest.objects.filter(
                    updated_at__lt=cutoff_pr
                )
                count_stale, _ = qs_pr_stale.delete()
                
                deleted_pr_count = count_merged + count_stale
                if deleted_pr_count > 0:
                    logger.info(f"[{tenant.schema_name}] Deleted {deleted_pr_count} old PullRequests.")

                # 5. Cleanup AI Insights
                # Delete insights created before the cutoff
                deleted_ai_count = 0
                qs_ai = AIInsight.objects.filter(
                    created_at__lt=cutoff_ai
                )
                if qs_ai.exists():
                    deleted_ai_count, _ = qs_ai.delete()
                    logger.info(f"[{tenant.schema_name}] Deleted {deleted_ai_count} old AI Insights.")

        except Exception as e:
            logger.error(f"Failed to process retention for tenant {tenant.schema_name}: {e}")

    logger.info("Global retention policy check completed.")
