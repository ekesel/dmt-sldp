---
phase: 14
plan: 2
wave: 1
---

# Plan 14.2: Portal Scaffolding & Design Integration

## Objective
Scaffold the Admin and Company portals using the shared design system and establish the core layout.

## Context
- [.gsd/phases/14/RESEARCH.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/.gsd/phases/14/RESEARCH.md)
- [frontend/apps/admin/package.json](file:///Users/ekesel/Desktop/projects/DMT-SLDP/frontend/apps/admin/package.json)
- [frontend/apps/app/package.json](file:///Users/ekesel/Desktop/projects/DMT-SLDP/frontend/apps/app/package.json)

## Tasks

<task type="auto">
  <name>Scaffold Admin Portal</name>
  <files>
    <file>frontend/apps/admin/app/page.tsx</file>
  </files>
  <action>
    1. Setup Next.js 14 App Router in `apps/admin`.
    2. Import and use the shared `ui` package for the landing page.
    3. Define as "Platform Administration" portal.
  </action>
  <verify>ls frontend/apps/admin/app/page.tsx</verify>
  <done>Admin portal renders a basic page using the shared UI.</done>
</task>

<task type="auto">
  <name>Scaffold Company Portal</name>
  <files>
    <file>frontend/apps/app/app/page.tsx</file>
  </files>
  <action>
    1. Setup Next.js 14 App Router in `apps/app`.
    2. Import and use the shared `ui` package.
    3. Define as "DMT-SLDP Company Portal".
  </action>
  <verify>ls frontend/apps/app/app/page.tsx</verify>
  <done>Company portal renders a basic page using the shared UI.</done>
</task>

## Success Criteria
- [ ] Both portals share the same design system and aesthetic.
- [ ] Apps are correctly isolated but share the same dev environment.
