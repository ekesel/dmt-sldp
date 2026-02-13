---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: GitHub Connector Implementation

## Objective
Implement the `GitHubConnector` to fetch and normalize pull requests from a GitHub repository.

## Context
- .gsd/phases/4/RESEARCH.md
- backend/data/connectors/base.py
- backend/data/connectors/factory.py

## Tasks

<task type="auto">
  <name>Create GitHubConnector</name>
  <files>
    - [NEW] backend/data/connectors/github.py
  </files>
  <action>
    - Inherit from `BaseConnector`.
    - Implement `fetch_pull_requests()`:
        - Use `requests` to call GitHub Repos API.
        - Handle pagination (rel="next").
        - Map response to normalized dict: {external_id, title, author_email, status, repository_name, source_branch, target_branch, created_at, updated_at, merged_at}.
    - Implement `fetch_work_items()` and `fetch_sprints()` as empty lists (GitHub is a git source, not a PM source).
    - Implement `validate_connection()` using a simple API call.
  </action>
  <verify>grep "class GitHubConnector" backend/data/connectors/github.py</verify>
  <done>GitHub connector is implemented and able to fetch pull requests.</done>
</task>

<task type="auto">
  <name>Register GitHub Connector</name>
  <files>backend/data/connectors/factory.py</files>
  <action>
    - Import `GitHubConnector`.
    - Add `'github': GitHubConnector` to the `_registry`.
  </action>
  <verify>grep "github" backend/data/connectors/factory.py</verify>
  <done>ConnectorFactory is updated to support GitHub integrations.</done>
</task>

## Success Criteria
- [ ] `GitHubConnector` file exists.
- [ ] `ConnectorFactory` returns `GitHubConnector` for type 'github'.
