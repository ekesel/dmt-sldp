---
phase: 16
plan: 1
wave: 1
---

# Plan 16.1: Infrastructure & Dependency Audit

## Objective
Audit the monorepo structure, dependency hygiene, and production scaling configurations.

## Context
- [frontend/package.json](file:///Users/ekesel/Desktop/projects/DMT-SLDP/frontend/package.json)
- [docker-compose.yml](file:///Users/ekesel/Desktop/projects/DMT-SLDP/docker-compose.yml)

## Tasks

<task type="auto">
  <name>Audit Monorepo Dependencies</name>
  <files>
    <file>frontend/package.json</file>
    <file>frontend/apps/admin/package.json</file>
    <file>frontend/apps/app/package.json</file>
  </files>
  <action>
    1. Check for redundant dependencies that should be in the root or shared packages.
    2. Verify all internal workspace links (@dmt/ui, @dmt/api) are correctly versionsed at "*".
    3. Run `npm audit` at the root and resolve critical issues.
  </action>
  <verify>grep "@dmt/" frontend/apps/*/package.json</verify>
  <done>Monorepo dependencies are clean and workspace links are healthy.</done>
</task>

<task type="auto">
  <name>Audit Production Scaling (Teleready)</name>
  <files>
    <file>docker-compose.yml</file>
  </files>
  <action>
    1. Verify `celery-worker` and `celery-beat` are configured for scale.
    2. Check for resource limits and restart policies.
    3. Ensure environment variables for the new portals are present.
  </action>
  <verify>grep "celery" docker-compose.yml</verify>
  <done>Production orchestration is ready for Milestone 1.3 loads.</done>
</task>

## Success Criteria
- [ ] No ghost dependencies in apps.
- [ ] Docker configuration supports at least 2 workers by default.
