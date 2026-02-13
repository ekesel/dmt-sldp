---
phase: 7
plan: 1
wave: 1
---

# Plan 7.1: Tenant-Aware Task Foundation

## Objective
Implement a robust foundation for executing Celery tasks within a multi-tenant environment, ensuring proper database schema isolation using `django-tenants`.

## Context
- .gsd/SPEC.md
- .gsd/phases/7/RESEARCH.md
- `backend/data/ai/tasks.py`
- `backend/data/tasks.py`

## Tasks

<task type="auto">
  <name>Implement Tenant-Aware Task Utility</name>
  <files>
    - backend/core/celery_utils.py
  </files>
  <action>
    Create a utility function or decorator `tenant_aware_task` that:
    1. Extracts `schema_name` from task arguments.
    2. Wraps the task execution in a `schema_context(schema_name)` block.
    3. Handles cases where `schema_name` is missing by logging an error.
  </action>
  <verify>Check for file existence and logic correctness via manual review.</verify>
  <done>Utility file created and correctly implements schema_context wrapping.</done>
</task>

<task type="auto">
  <name>Refactor AI Insight Task for Tenant Awareness</name>
  <files>
    - backend/data/ai/tasks.py
  </files>
  <action>
    Apply the `tenant_aware_task` utility to `refresh_ai_insights`.
    Ensure the task accepts `schema_name` and uses it to establish the database context before performing any ORM operations.
  </action>
  <verify>Run a dry-run check of the task import and signature.</verify>
  <done>Task signature updated to accept schema_name and correctly uses context.</done>
</task>

## Success Criteria
- [ ] Celery tasks can be executed with explicit tenant schema isolation.
- [ ] `refresh_ai_insights` no longer relies on the "public" schema context by default.
