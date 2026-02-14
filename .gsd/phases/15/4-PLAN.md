---
phase: 15
plan: 4
wave: 2
---

# Plan 15.4: Company Metrics & Compliance

## Objective
Provide granular developer-level visibility and a dedicated interface for managing compliance flags.

## Context
- [.gsd/phases/15/RESEARCH.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/.gsd/phases/15/RESEARCH.md)
- [PRD.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/PRD.md)

## Tasks

<task type="auto">
  <name>Implement Developer Metrics View</name>
  <files>
    <file>frontend/apps/app/app/metrics/page.tsx</file>
  </files>
  <action>
    1. Build a table/grid view for individual developer metrics.
    2. Fetch data from `/api/developers`.
    3. Align with SLDP framework (Throughput vs Quality).
  </action>
  <verify>ls frontend/apps/app/app/metrics/page.tsx</verify>
  <done>Users can drill down into individual contributor metrics.</done>
</task>

<task type="auto">
  <name>Implement Compliance Flag Center</name>
  <files>
    <file>frontend/apps/app/app/compliance/page.tsx</file>
  </files>
  <action>
    1. Build a filterable dashboard for active `ComplianceFlag` records.
    2. Implement "Resolve" action calling the backend.
    3. High visibility for "Missing PR Link" or "Low Coverage".
  </action>
  <verify>ls frontend/apps/app/app/compliance/page.tsx</verify>
  <done>Teams can review and remediate DMT quality violations in the UI.</done>
</task>

## Success Criteria
- [ ] Compliance page lists at least one flag if backend provides it.
- [ ] Developer metrics show accurate completion rates and quality flags.
