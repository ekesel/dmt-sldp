---
phase: 4
plan: 2
wave: 2
---

# Plan 4.2: PR Sync & Linking Logic

## Objective
Update the data synchronization task to process Pull Requests and link them to their corresponding WorkItems.

## Context
- backend/data/tasks.py
- backend/data/models.py
- .gsd/phases/4/RESEARCH.md

## Tasks

<task type="auto">
  <name>Update Sync Task for PRs</name>
  <files>backend/data/tasks.py</files>
  <action>
    - Modify `sync_tenant_data` task.
    - Add logic to call `connector.fetch_pull_requests()`.
    - Iterate and `update_or_create` `PullRequest` records.
    - Implement regex matching (e.g., `\[([A-Z]+-\d+)\]` or `([A-Z]+-\d+)`) in title/branch to find `WorkItem` ID.
    - Link `PullRequest` to matching `WorkItem` if found.
  </action>
  <verify>grep "connector.fetch_pull_requests" backend/data/tasks.py</verify>
  <done>Pull requests are synchronized and automatically linked to work items based on ID patterns.</done>
</task>

## Success Criteria
- [ ] `sync_tenant_data` processes pull requests.
- [ ] The `work_item` field in `PullRequest` is populated for items following the naming convention.
