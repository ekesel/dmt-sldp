---
phase: 5
plan: 1
wave: 1
---

# Plan 5.1: ClickUp Integration

## Objective
Implement ClickUp as an additional project management tool source, enabling DMT compliance tracking for ClickUp workspaces alongside existing Jira support.

## Context
- `.gsd/SPEC.md` — REQ-08 (Advanced integration support)
- `.gsd/phases/5/RESEARCH.md` — ClickUp API details
- `backend/data/sources/` — Existing source integration pattern
- `backend/data/models.py` — Integration model

## Tasks

<task type="auto">
  <name>Create ClickUp Source Adapter</name>
  <files>backend/data/sources/clickup.py</files>
  <action>
    Create `ClickUpSource` class following the pattern established in existing source adapters.
    
    - Implement OAuth 2.0 authentication with token storage in Integration model
    - Create methods: `fetch_tasks()`, `fetch_lists()`, `normalize_task_to_workitem()`
    - Map ClickUp entities to normalized schema:
      - Task → WorkItem
      - List → Project (by external_id)
      - Assignee → Developer (match by email)
      - Status → WorkItem.status
    - Handle pagination (ClickUp returns 100 tasks per page)
    - Implement error handling for API rate limits
    
    AVOID creating webhook handlers in this task (deferred to future enhancement).
  </action>
  <verify>
    python manage.py shell -c "from backend.data.sources.clickup import ClickUpSource; print('ClickUp source adapter loaded')"
  </verify>
  <done>ClickUpSource class exists with fetch_tasks, fetch_lists, and normalization methods</done>
</task>

<task type="auto">
  <name>Integrate ClickUp Into ETL Pipeline</name>
  <files>backend/data/tasks.py, backend/admin/views.py</files>
  <action>
    Update the ETL sync workflow to support ClickUp integrations.
    
    - In `sync_tenant_data` task: Add conditional branch for `integration.source_type == 'clickup'`
    - Call `ClickUpSource(integration).fetch_tasks()` and save to WorkItem model
    - In Admin Portal integration form: Add "ClickUp" to source_type choices
    - Add configuration fields for ClickUp: workspace_id, api_token
    
    Reuse existing normalization logic where possible (Developer matching, Project lookup).
  </action>
  <verify>
    # Create test integration record with source_type='clickup' and verify ETL task can be triggered (mock mode)
    python manage.py shell -c "from backend.data.models import Integration; i = Integration.objects.create(source_type='clickup', name='Test'); print(i)"
  </verify>
  <done>ETL pipeline supports ClickUp source type and Admin Portal form includes ClickUp option</done>
</task>

## Success Criteria
- [ ] ClickUpSource adapter implemented with OAuth and task fetching
- [ ] ETL pipeline processes ClickUp tasks into normalized WorkItem model
- [ ] Admin Portal allows creating Click Up integrations
