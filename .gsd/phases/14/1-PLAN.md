---
phase: 14
plan: 1
wave: 1
---

# Plan 14.1: Monorepo Migration & Shared UI

## Objective
Convert the current fragmented frontend structure into a clean npm workspaces monorepo and initialize the unified design system.

## Context
- [.gsd/phases/14/RESEARCH.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/.gsd/phases/14/RESEARCH.md)
- [PRD.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/PRD.md)
- [frontend/package.json](file:///Users/ekesel/Desktop/projects/DMT-SLDP/frontend/package.json)

## Tasks

<task type="auto">
  <name>Monorepo Restructuring</name>
  <files>
    <file>frontend/package.json</file>
  </files>
  <action>
    1. Create `frontend/apps` and `frontend/packages` directories.
    2. Move `frontend/admin` to `frontend/apps/admin`.
    3. Move `frontend/app` to `frontend/apps/app`.
    4. Update root `frontend/package.json` to include `"workspaces": ["apps/*", "packages/*"]`.
    5. Cleanup redundant `node_modules` and lockfiles.
  </action>
  <verify>ls -R frontend/apps frontend/packages && grep "workspaces" frontend/package.json</verify>
  <done>Frontend project follows a workspace-based monorepo structure.</done>
</task>

<task type="auto">
  <name>Initialize packages/ui</name>
  <files>
    <file>frontend/packages/ui/package.json</file>
    <file>frontend/packages/ui/tailwind.config.js</file>
  </files>
  <action>
    1. Create `frontend/packages/ui` as a shared library.
    2. Setup Tailwind CSS with a "premium" theme (colors, shadows, glassmorphism defaults).
    3. Create and export a base `Card` component with glassmorphism styles.
  </action>
  <verify>ls frontend/packages/ui/package.json</verify>
  <done>Shared UI package is initialized and ready for consumption.</done>
</task>

## Success Criteria
- [ ] Root `npm install` installs dependencies for all workspaces.
- [ ] `packages/ui` exists and exports at least one component.
