---
phase: 3
plan: 2
wave: 1
---

# Plan 3.2: Real-time Signal Integration

## Objective
Automate the broadcasting of project updates via WebSockets when data changes in the backend.

## Context
- .gsd/phases/3/RESEARCH.md
- backend/data/models.py
- backend/data/consumers.py

## Tasks

<task type="auto">
  <name>Implement Telemetry Signals</name>
  <files>
    - backend/data/signals.py
    - backend/data/apps.py
  </files>
  <action>
    - Create `backend/data/signals.py`.
    - Implement `post_save` handlers for `WorkItem` and `AIInsight`.
    - Logic: When a `WorkItem` is updated or a new `AIInsight` is created, use the `channel_layer` to broadcast a `telemetry_update` message to the corresponding `tenant_{id}` group.
    - Standardize the message format for the frontend (type: `metrics_update`).
    - Connect the signals in `backend/data/apps.py` `ready()` method.
  </action>
  <verify>grep "channel_layer.group_send" backend/data/signals.py</verify>
  <done>Backend data changes automatically trigger real-time WebSocket broadcasts.</done>
</task>

<task type="auto">
  <name>Add Telemetry Handler to Consumer</name>
  <files>backend/data/consumers.py</files>
  <action>
    - Add `telemetry_update(self, event)` method to `TelemetryConsumer`.
    - Logic: Forward the event message to the client.
  </action>
  <verify>grep "async def telemetry_update" backend/data/consumers.py</verify>
  <done>WebSocket consumer is capable of handling and forwarding telemetry events.</done>
</task>

## Success Criteria
- [ ] Saving a `WorkItem` triggers a WebSocket broadcast.
- [ ] The message received by the client contains the expected metric payload.
