---
phase: 13
plan: 2
wave: 1
---

# Plan 13.2: Work Attribution Integration

## Objective
Integrate the identity resolver into the data synchronization pipeline to attribute work items and pull requests to actual users.

## Context
- [.gsd/phases/13/RESEARCH.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/.gsd/phases/13/RESEARCH.md)
- [backend/data/models.py](file:///Users/ekesel/Desktop/projects/DMT-SLDP/backend/data/models.py)
- [backend/data/tasks.py](file:///Users/ekesel/Desktop/projects/DMT-SLDP/backend/data/tasks.py)

## Tasks

<task type="auto">
  <name>Update Data Models</name>
  <files>
    <file>backend/data/models.py</file>
  </files>
  <action>
    Update `WorkItem` to include `resolved_assignee` (FK to `users.User`, null=True).
    Update `PullRequest` to include `resolved_author` (FK to `users.User`, null=True).
  </action>
  <verify>python3 manage.py makemigrations data && python3 manage.py migrate</verify>
  <done>Models are updated to track resolved platform users.</done>
</task>

<task type="auto">
  <name>Integrate Resolver in Tasks</name>
  <files>
    <file>backend/data/tasks.py</file>
  </files>
  <action>
    In `sync_tenant_data`, utilize `IdentityService.resolve_user` during `WorkItem` and `PullRequest` creation/update.
    Populate the `resolved_assignee` and `resolved_author` fields.
  </action>
  <verify>grep "IdentityService" backend/data/tasks.py</verify>
  <done>Work attribution is automated during data synchronization.</done>
</task>

## Success Criteria
- [ ] Synced WorkItems have a `resolved_assignee` if a platform user matches.
- [ ] Synced PullRequests have a `resolved_author` if a platform user matches.
