---
phase: 5
plan: 3
wave: 2
---

# Plan 5.3: Data Retention Policies

## Objective
Implement automatic data retention policies with configurable per-tenant retention periods and scheduled cleanup jobs to maintain database health and comply with data governance requirements.

## Context
- `.gsd/SPEC.md` — REQ-10 (Retention policies)
- `.gsd/phases/5/RESEARCH.md` — PostgreSQL retention strategies
- `backend/data/models.py` — Tenant and data models
- `backend/core/celery.py` — Celery configuration

## Tasks

<task type="auto">
  <name>Create Retention Policy Model and Cleanup Command</name>
  <files>backend/data/models.py, backend/data/management/commands/cleanup_old_data.py</files>
  <action>
    Define retention policy model and implement cleanup logic.
    
    1. Add `RetentionPolicy` model to `backend/data/models.py`:
       ```python
       class RetentionPolicy(models.Model):
           tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE)
           work_items_months = models.IntegerField(default=12)
           ai_insights_months = models.IntegerField(default=6)
           audit_logs_months = models.IntegerField(default=24)
       ```
    
    2. Create Django management command `cleanup_old_data`:
       - Iterate through all tenants with `connection.set_tenant(tenant)`
       - For each data type, calculate cutoff date: `now() - timedelta(months=policy.X_months)`
       - Delete in chunks of 1000 records with 0.1s sleep between batches
       - Log deletion counts per tenant
       - Use `.filter(created_at__lt=cutoff).order_by('id')[:1000].delete()`
    
    AVOID deleting linked records (use soft delete if dependencies exist).
  </action>
  <verify>
    python manage.py cleanup_old_data --dry-run
  </verify>
  <done>RetentionPolicy model exists and cleanup_old_data command can execute in dry-run mode</done>
</task>

<task type="auto">
  <name>Schedule Retention Cleanup with Celery Beat</name>
  <files>backend/core/celery.py, backend/data/tasks.py</files>
  <action>
    Configure automatic scheduling for data retention cleanup.
    
    1. Create Celery task in `backend/data/tasks.py`:
       ```python
       @shared_task
       def run_retention_cleanup():
           call_command('cleanup_old_data')
       ```
    
    2. Add to Celery Beat schedule in `backend/core/celery.py`:
       ```python
       app.conf.beat_schedule = {
           'retention-cleanup': {
               'task': 'backend.data.tasks.run_retention_cleanup',
               'schedule': crontab(hour=2, minute=0),  # 2 AM daily
           },
       }
       ```
    
    Ensure task respects tenant isolation via `connection.set_tenant()`.
  </action>
  <verify>
    python manage.py shell -c "from backend.data.tasks import run_retention_cleanup; print(run_retention_cleanup)"
  </verify>
  <done>Celery Beat schedule includes retention cleanup task running daily at 2 AM</done>
</task>

## Success Criteria
- [ ] RetentionPolicy model with configurable retention periods per tenant
- [ ] cleanup_old_data management command deletes old data in chunks
- [ ] Celery Beat automatically runs cleanup daily
