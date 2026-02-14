# Research: Phase 12 - Ecosystem Foundation

## 1. Typed Telemetry (Pydantic + Django Signals)

### Problem
Current signal payloads are unstructured dictionaries, leading to potential runtime errors and lack of documentation on what data is being passed between components.

### Solution: Signal Payloads as Pydantic Models
Instead of `data_sync_completed.send(sender=self, integration_id=id, schema_name=name)`, we will use:
```python
class DataSyncPayload(BaseModel):
    integration_id: int
    schema_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

data_sync_completed.send(sender=self, payload=DataSyncPayload(...))
```

### Benefits
- **Validation**: Signals fail immediately if payload is malformed.
- **Documentation**: Pydantic models act as "contracts" for integration.
- **IDE Support**: Autocomplete and type checking for signal receivers.

---

## 2. Resilient Docker Scaling (Celery Queues)

### Problem
The current single `celery-worker` handles both lightweight data syncs and heavy AI processing. A burst of AI tasks can block critical data synchronization.

### Solution: Worker Isolation
We will define two worker services in `docker-compose.yml`:

1.  **`celery-worker` (Default)**: Handles general tasks (data sync, analytics aggregation).
    - Command: `celery -A core worker -l info -Q celery`
2.  **`celery-worker-ai` (Isolated)**: Handles compute-heavy AI insight generation.
    - Command: `celery -A core worker -l info -Q ai_insights`

### Task Configuration
Tasks will be explicitly routed:
```python
@shared_task(queue='ai_insights')
@tenant_aware_task
def refresh_ai_insights(...):
    ...
```

### Benefits
- **Priority**: High-priority syncs are never blocked by AI processing.
- **Resource Allocation**: Can scale AI workers independently of default workers.
