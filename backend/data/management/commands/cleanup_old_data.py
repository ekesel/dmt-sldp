from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db import connection
from backend.data.models import WorkItem, AIInsight, PullRequest, RetentionPolicy
from customers.models import Client
import time

class Command(BaseCommand):
    help = 'Cleans up old data based on tenant retention policies'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Simulate deletion without committing')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        tenants = Client.objects.all().exclude(schema_name='public')

        for tenant in tenants:
            self.stdout.write(f"Processing tenant: {tenant.schema_name}")
            with connection.cursor() as cursor:
                cursor.execute(f"SET search_path to {tenant.schema_name}")
                
                try:
                    policy = RetentionPolicy.objects.get(tenant=tenant)
                except RetentionPolicy.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f" No retention policy for {tenant}. Skipping."))
                    continue

                self.cleanup_data(WorkItem, policy.work_items_months, dry_run)
                self.cleanup_data(AIInsight, policy.ai_insights_months, dry_run)
                self.cleanup_data(PullRequest, policy.pull_requests_months, dry_run)

    def cleanup_data(self, model, months, dry_run):
        cutoff_date = timezone.now() - timedelta(days=months * 30)
        old_records = model.objects.filter(created_at__lt=cutoff_date)
        count = old_records.count()

        self.stdout.write(f"  Found {count} old {model.__name__} records.")

        if dry_run:
            self.stdout.write(f"  [Dry Run] Would delete {count} records.")
            return

        deleted_count = 0
        while old_records.exists():
            # Delete in chunks to avoid large locks
            ids_to_delete = list(old_records.values_list('id', flat=True)[:1000])
            model.objects.filter(id__in=ids_to_delete).delete()
            deleted_count += len(ids_to_delete)
            self.stdout.write(f"  Deleted {deleted_count}/{count} records...")
            time.sleep(0.1) # Brief pause
