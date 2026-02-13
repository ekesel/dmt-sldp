---
phase: 5
plan: 1
wave: 1
status: complete
---

# Summary 5.1: ClickUp Integration

## Accomplishments
- Implemented `ClickUpSource` adapter with support for fetching lists, tasks, and normalizing them to the DMT schema.
- Built `ClickUpConnector` to integrate the source with the ETL pipeline.
- Refactored `ConnectorFactory` into a dedicated file (`backend/data/connectors/factory.py`) and registered the ClickUp source.
- Validated that ClickUp is a listed source type in the `Integration` model.

## Evidence
- Files created: `backend/data/sources/clickup.py`, `backend/data/connectors/clickup.py`, `backend/data/connectors/factory.py`.
- Git commit: `feat(phase-5): implement clickup source integration`.
- ClickUp tasks are correctly mapped to `WorkItem` attributes (external_id, title, status, etc.).
