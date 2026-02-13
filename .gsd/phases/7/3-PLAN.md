---
phase: 7
plan: 3
wave: 2
---

# Plan 7.3: Background ETL Hardening

## Objective
Enhance the resilience of background ETL processes by implementing task-level status monitoring and persistent error logging.

## Context
- .gsd/SPEC.md
- `backend/data/models.py`
- `backend/data/tasks.py`

## Tasks

<task type="auto">
  <name>Implement Task Log Model</name>
  <files>
    - backend/data/models.py
  </files>
  <action>
    Create a new model `TaskLog` that stores:
    - `task_name`: Name of the executed task.
    - `integration`: FK to Integration.
    - `status`: success/failure/running.
    - `error_message`: Optional field for tracebacks.
    - `started_at`, `finished_at`: Timestamps.
  </action>
  <verify>Run migrations and check DB schema.</verify>
  <done>TaskLog model created and migrated.</done>
</task>

<task type="auto">
  <name>Hardware Sync Task with Logging</name>
  <files>
    - backend/data/tasks.py
  </files>
  <action>
    Update `sync_tenant_data` to:
    1. Create a `TaskLog` entry at start.
    2. Wrap the entire sync logic in a try/except block.
    3. Update the `TaskLog` entry with duration and status (success/failure) upon completion.
  </action>
  <verify>Check `TaskLog` entries after running a sync.</verify>
  <done>Sync task now persists execution logs for auditability.</done>
</task>

## Success Criteria
- [ ] Every background sync execution is recorded in the `TaskLog` table.
- [ ] Failed syncs capture actionable error information for debugging.
