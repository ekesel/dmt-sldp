---
phase: 12
plan: 1
wave: 1
---

# Plan 12.1: Typed Telemetry Implementation

## Objective
Migrate the current dictionary-based signal payloads to strictly typed Pydantic models. This ensures runtime validation and provides a clear data contract between emitters (data sync) and consumers (AI insights, analytics).

## Context
- [.gsd/phases/12/RESEARCH.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/.gsd/phases/12/RESEARCH.md)
- [backend/data/signals.py](file:///Users/ekesel/Desktop/projects/DMT-SLDP/backend/data/signals.py)
- [backend/data/tasks.py](file:///Users/ekesel/Desktop/projects/DMT-SLDP/backend/data/tasks.py)

## Tasks

<task type="auto">
  <name>Create Telemetry Models</name>
  <files>
    <file>backend/core/telemetry/models.py</file>
  </files>
  <action>
    Create a new directory `backend/core/telemetry/` with `__init__.py`.
    Implement `DataSyncPayload` Pydantic model with fields:
    - `integration_id`: int
    - `schema_name`: str
    - `status`: str (success/failed)
    - `timestamp`: datetime
  </action>
  <verify>python3 -c "from core.telemetry.models import DataSyncPayload; print(DataSyncPayload(integration_id=1, schema_name='public', status='success', timestamp='2024-01-01T00:00:00Z'))"</verify>
  <done>Pydantic models are importable and validate correctly.</done>
</task>

<task type="auto">
  <name>Refactor Signal Emission</name>
  <files>
    <file>backend/data/signals.py</file>
    <file>backend/data/tasks.py</file>
  </files>
  <action>
    Update `data_sync_completed` signal to expect a `payload` argument.
    Modify `sync_tenant_data` in `backend/data/tasks.py` to instantiate `DataSyncPayload` and send it via the signal.
  </action>
  <verify>grep "payload=" backend/data/tasks.py</verify>
  <done>Signals are emitted with Pydantic payloads instead of individual kwargs.</done>
</task>

<task type="auto">
  <name>Refactor Signal Receivers</name>
  <files>
    <file>backend/data/signals.py</file>
    <file>backend/data/ai/tasks.py</file>
  </files>
  <action>
    Update `trigger_ai_refresh` in `backend/data/signals.py` to extract data from the `payload` object.
    Ensure `refresh_ai_insights.delay()` is called with the unpacked payload values.
  </action>
  <verify>grep "payload." backend/data/signals.py</verify>
  <done>Receivers correctly handle the Pydantic payload object.</done>
</task>

## Success Criteria
- [ ] System-wide signals use Pydantic models for data transfer.
- [ ] AI insight generation still triggers correctly after a sync.
- [ ] Malformed signal data raises a Pydantic `ValidationError`.
