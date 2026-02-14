---
phase: 13
plan: 1
wave: 1
---

# Plan 13.1: Identity Mapping Engine

## Objective
Implement the core mapping layer to resolve external tool identities (GitHub/Jira) to internal platform users.

## Context
- [.gsd/phases/13/RESEARCH.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/.gsd/phases/13/RESEARCH.md)
- [backend/users/models.py](file:///Users/ekesel/Desktop/projects/DMT-SLDP/backend/users/models.py)
- [backend/data/models.py](file:///Users/ekesel/Desktop/projects/DMT-SLDP/backend/data/models.py)

## Tasks

<task type="auto">
  <name>Create ExternalIdentity Model</name>
  <files>
    <file>backend/users/models.py</file>
  </files>
  <action>
    Add `ExternalIdentity` model to `backend/users/models.py`.
    Fields: `user` (FK), `provider` (Choice), `external_id` (String).
    Add unique constraint on `(provider, external_id)`.
  </action>
  <verify>python3 manage.py makemigrations users && python3 manage.py migrate</verify>
  <done>Model is created and migrations applied.</done>
</task>

<task type="auto">
  <name>Implement IdentityService</name>
  <files>
    <file>backend/users/services.py</file>
  </files>
  <action>
    Create `IdentityService` with a `resolve_user(provider, identifier)` method.
    Logic:
    1. Check `ExternalIdentity` for match.
    2. Fallback to `User.objects.filter(email=identifier)` or `username=identifier`.
  </action>
  <verify>python3 manage.py shell -c "from users.services import IdentityService; print(IdentityService.resolve_user('github', 'testuser'))"</verify>
  <done>Service correctly resolves identities based on priority logic.</done>
</task>

## Success Criteria
- [ ] Multiple external IDs can map to a single internal User.
- [ ] Resolution logic correctly handles both explicit mappings and email fallbacks.
