---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Normalized Schema & Integration Models

## Objective
Establish the database models for normalized data storage within the tenant schemas.

## Tasks
<task type="auto">
  <name>Create Data App</name>
  <files>
    - backend/data/__init__.py
    - backend/data/apps.py
  </files>
  <action>Register the 'data' app in SHARED_APPS or TENANT_APPS as appropriate (TENANT_APPS for data, SHARED_APPS if integrations are shared).</action>
  <verify>Check settings.py and apps.py.</verify>
  <done>App created and registered.</done>
</task>

<task type="auto">
  <name>Define Normalized Models</name>
  <files>
    - backend/data/models.py
  </files>
  <action>Implement WorkItem, Sprint, PullRequest, and Integration models.</action>
  <verify>Run 'python manage.py makemigrations data'.</verify>
  <done>Models defined and migrations generated.</done>
</task>

## Verification
- Successful migration creation.
- Models visible in Django admin (when registered).
