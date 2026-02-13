---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Foundation & Support Infrastructure

## Objective
Restore the missing Compliance Engine and setup the AI task skeleton to unblock the data pipeline.

## Context
- .gsd/SPEC.md
- backend/data/tasks.py
- .gsd/phases/2/RESEARCH.md

## Tasks

<task type="auto">
  <name>Implement Compliance Engine</name>
  <files>backend/data/engine/compliance.py</files>
  <action>
    - Create `backend/data/engine/compliance.py`.
    - Implement the `ComplianceEngine` class with a `check_compliance(work_item)` method.
    - Logic: Set `work_item.is_compliant = True` if the item has at least one linked `PullRequest`.
    - Handle JSON `compliance_reason` to explain why an item is non-compliant.
  </action>
  <verify>test -f backend/data/engine/compliance.py</verify>
  <done>ComplianceEngine is implemented and correctly integrated into the WorkItem lifecycle.</done>
</task>

<task type="auto">
  <name>Setup AI Task Skeleton & Dependencies</name>
  <files>
    - backend/requirements.txt
    - backend/data/ai/tasks.py
  </files>
  <action>
    - Add `google-cloud-aiplatform` to `backend/requirements.txt`.
    - Create `backend/data/ai/tasks.py`.
    - Define a mock `refresh_ai_insights(integration_id)` task that creates a mock `AIInsight` for the given integration to test the Celery wiring.
  </action>
  <verify>grep "refresh_ai_insights" backend/data/ai/tasks.py</verify>
  <done>AI task wiring is restored and dependencies are declared.</done>
</task>

## Success Criteria
- [ ] `ComplianceEngine` is functional and called during sync.
- [ ] `refresh_ai_insights` task is registered with Celery.
