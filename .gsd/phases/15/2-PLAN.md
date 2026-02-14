---
phase: 15
plan: 2
wave: 1
---

# Plan 15.2: Admin Source Connectivity

## Objective
Implement source configuration management, including auto-discovery and manual sync triggers.

## Context
- [.gsd/phases/15/RESEARCH.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/.gsd/phases/15/RESEARCH.md)
- [frontend/packages/api/](file:///Users/ekesel/Desktop/projects/DMT-SLDP/frontend/packages/api/)

## Tasks

<task type="auto">
  <name>Implement Source Configuration UI</name>
  <files>
    <file>frontend/apps/admin/app/projects/[id]/sources/page.tsx</file>
  </files>
  <action>
    1. Create a management page for source configurations (Jira, GitHub, etc.).
    2. Add status indicators for "Last Sync" and health.
  </action>
  <verify>ls frontend/apps/admin/app/projects/[id]/sources/page.tsx</verify>
  <done>Admins can view and monitor source configurations per project.</done>
</task>

<task type="auto">
  <name>Implement Discovery and Sync Triggers</name>
  <files>
    <file>frontend/apps/admin/app/projects/[id]/sources/[sourceId]/page.tsx</file>
  </files>
  <action>
    1. Implement "Discover Fields" button calling the discovery endpoint.
    2. Implement "Trigger Sync" button to initiate manual ETL.
    3. Display sync logs/status in real-time (polling or stubbed).
  </action>
  <verify>grep "Trigger Sync" frontend/apps/admin/app/projects/[id]/sources/[sourceId]/page.tsx</verify>
  <done>Source discovery and sync can be manually initiated via the UI.</done>
</task>

## Success Criteria
- [ ] Admins can trigger a backfill or discovery for a configured Jira source.
- [ ] Sync status reflects real-time status from the API.
