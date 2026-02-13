---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Secured Telemetry Consumer

## Objective
Harden the WebSocket connection to ensure tenant isolation and rename the consumer to better reflect its production role.

## Context
- .gsd/phases/3/RESEARCH.md
- backend/data/consumers.py
- backend/data/routing.py

## Tasks

<task type="auto">
  <name>Harden & Rename WebSocket Consumer</name>
  <files>
    - backend/data/consumers.py
    - backend/data/routing.py
  </files>
  <action>
    - Rename `SyncConsumer` to `TelemetryConsumer` in `backend/data/consumers.py`.
    - Update `connect()` to validate that the user is authenticated and belongs to the requested tenant group.
    - Standardize the group name format to `tenant_{tenant_id}`.
    - Update `backend/data/routing.py` to use the new `TelemetryConsumer` and rename the path to `ws/telemetry/(?P<tenant_id>\w+)/`.
  </action>
  <verify>grep "TelemetryConsumer" backend/data/consumers.py</verify>
  <done>WebSocket consumer is renamed, hardened, and isolated by tenant.</done>
</task>

<task type="auto">
  <name>Align Frontend WebSocket URL</name>
  <files>.env.example</files>
  <action>
    - Update `NEXT_PUBLIC_WS_URL` in `.env.example` to point to the new `/ws/telemetry/` path.
  </action>
  <verify>grep "/ws/telemetry/" .env.example</verify>
  <done>Frontend configuration template is aligned with the new backend routing.</done>
</task>

## Success Criteria
- [ ] WebSocket connections are rejected if unauthorized.
- [ ] Connections are strictly isolated by tenant groups.
