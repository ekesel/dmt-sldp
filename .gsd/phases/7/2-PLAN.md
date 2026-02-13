---
phase: 7
plan: 2
wave: 1
---

# Plan 7.2: Asynchronous AI Decoupling

## Objective
Decouple the AI Insight generation from the main data synchronization task using Django signals, enabling more flexible and resilient background processing.

## Context
- .gsd/SPEC.md
- `backend/data/tasks.py`
- `backend/data/signals.py`
- `backend/data/ai/tasks.py`

## Tasks

<task type="auto">
  <name>Implement Data Sync Completed Signal</name>
  <files>
    - backend/data/signals.py
  </files>
  <action>
    Create a custom Django signal `data_sync_completed` that:
    1. Accepts `integration_id` and `schema_name`.
    2. Define a receiver function that triggers `refresh_ai_insights.delay(integration_id, schema_name=schema_name)`.
  </action>
  <verify>Check signal definition and connection in `backend/data/apps.py`.</verify>
  <done>Custom signal defined and connected to AI refresh task.</done>
</task>

<task type="auto">
  <name>Refactor Sync Task to Emit Signal</name>
  <files>
    - backend/data/tasks.py
  </files>
  <action>
    Modify `sync_tenant_data` to:
    1. Remove the direct call to `refresh_ai_insights.delay()`.
    2. Import the `data_sync_completed` signal.
    3. Send the signal at the end of a successful sync cycle, passing `integration_id` and the current `connection.schema_name`.
  </action>
  <verify>Ensure `sync_tenant_data` no longer has hard dependencies on `backend.data.ai.tasks`.</verify>
  <done>Sync task decoupled from AI task via signal emission.</done>
</task>

## Success Criteria
- [ ] AI insight generation is triggered asynchronously via signals.
- [ ] `sync_tenant_data` completes independently of AI processing success.
