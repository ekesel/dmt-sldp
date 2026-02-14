---
phase: 16
plan: 2
wave: 1
---

# Plan 16.2: End-to-End Functional Verification

## Objective
Verify the full data lifecycle from backend telemetry to frontend visualization, including identity resolution.

## Context
- [.gsd/SPEC.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/.gsd/SPEC.md)
- [backend/core/telemetry/](file:///Users/ekesel/Desktop/projects/DMT-SLDP/backend/core/telemetry/)
- [frontend/apps/app/app/dashboard/page.tsx](file:///Users/ekesel/Desktop/projects/DMT-SLDP/frontend/apps/app/app/dashboard/page.tsx)

## Tasks

<task type="auto">
  <name>Verify Telemetry to Dashboard Flow</name>
  <files>
    <file>backend/core/telemetry/signals.py</file>
  </files>
  <action>
    1. Inspect Pydantic model usage for `WorkItem` signals.
    2. Verify the API response from `/api/dashboard/summary` matches the expected telemetry types.
    3. Proof: Trace a mock signal to see how it impacts the frontend KPICards.
  </action>
  <verify>python manage.py test backend/core/telemetry/</verify>
  <done>Telemetry correctly flows from source to UI with strict typing.</done>
</task>

<task type="auto">
  <name>Audit Author Resolution E2E</name>
  <files>
    <file>backend/users/models.py</file>
  </files>
  <action>
    1. Check author mapping logic for GitHub usernames.
    2. Verify frontend `app/metrics` correctly displays "Internal User (GitHub Name)" pattern.
  </action>
  <verify>grep "GitHub" backend/users/models.py</verify>
  <done>Git identities are successfully attributed to platform users in the UI.</done>
</task>

## Success Criteria
- [ ] 100% of telemetry signals use Pydantic validation.
- [ ] Contributor metrics show resolved names, not raw GitHub strings.
