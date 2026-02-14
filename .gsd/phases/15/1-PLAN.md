---
phase: 15
plan: 1
wave: 1
---

# Plan 15.1: Shared API Utility & Admin Base

## Objective
Establish the shared API communication layer and provide the base management UI for Tenants and Projects in the Admin Portal.

## Context
- [.gsd/phases/15/RESEARCH.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/.gsd/phases/15/RESEARCH.md)
- [PRD.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/PRD.md)
- [frontend/packages/ui/](file:///Users/ekesel/Desktop/projects/DMT-SLDP/frontend/packages/ui/)

## Tasks

<task type="auto">
  <name>Initialize shared @dmt/api package</name>
  <files>
    <file>frontend/packages/api/package.json</file>
    <file>frontend/packages/api/index.ts</file>
  </files>
  <action>
    1. Create `frontend/packages/api` as a workspace.
    2. Implement an Axios client with interceptors for multi-tenant headers (`X-Tenant`).
    3. Export base functions for `tenants` and `projects` API calls.
  </action>
  <verify>ls frontend/packages/api/index.ts && grep "X-Tenant" frontend/packages/api/index.ts</verify>
  <done>Shared API package is available and handles multi-tenancy headers.</done>
</task>

<task type="auto">
  <name>Implement Admin Tenant/Project management</name>
  <files>
    <file>frontend/apps/admin/app/tenants/page.tsx</file>
    <file>frontend/apps/admin/app/projects/page.tsx</file>
  </files>
  <action>
    1. Build a list view for Tenants and Projects using shared `@dmt/ui` components.
    2. Integrate with `@dmt/api` to fetch and display data.
    3. Add basic "Create" modal stub.
  </action>
  <verify>ls frontend/apps/admin/app/tenants/page.tsx && ls frontend/apps/admin/app/projects/page.tsx</verify>
  <done>Admin portal can list and display tenants/projects from the backend.</done>
</task>

## Success Criteria
- [ ] `@dmt/api` successfully linked and used by Admin app.
- [ ] Admin portal lists at least the "test_tenant" if it exists.
