# Research: Phase 7 - Asynchronous Workflow Foundation

## Objective
Research the best practices for implementing asynchronous, tenant-aware background processing in a multi-tenant Django (PostgreSQL schemas) environment using Celery and Redis.

## Findings

### 1. Tenant-Aware Celery Tasks
In a `django-tenants` architecture, tasks must execute within the specific schema of a tenant.
- **Mechanism**: Pass the `schema_name` as a keyword argument to the task.
- **Execution**: Wrap the task logic inside a `with schema_context(schema_name):` block.
- **Alternative**: Use the `tenant-schemas-celery` library which handles this automatically by overriding the `Task` class. However, manual wrapping is more explicit and preserves standard Celery behavior.

### 2. Event-Driven AI Insights
- **Trigger**: Instead of calling `.delay()` directly at the end of the sync task, use Django signals (`post_save` on `Integration` or a custom signal) to decouple the data sync from the AI processing.
- **Benefit**: AI insights can be triggered by multiple events (sync completion, manual refresh, or periodic check).

### 3. Failure Persistence & Resilience
- **Dead Letter Queues (DLQ)**: Use a separate Redis queue/key for tasks that exceed max retries.
- **Visibility**: Log consecutive failures to a tenant-level `SystemLog` model to alert admins (v1.2 expansion).
- **Circuit Breaker**: The existing service-level circuit breaker in `GeminiAIProvider` is good, but Celery retries should be coordinated (e.g., `autoretry_for=(Exception,)`, `retry_backoff=True`).

## Implementation Strategy
1. **Base Task Class**: Create a `TenantAwareTask` or a decorator that automatically extracts `schema_name` and sets the context.
2. **Decoupled AI Sync**: Use a custom signal `data_sync_completed` to trigger AI insights.
3. **Queue Separation**: Categorize tasks into `high-priority` (sync) and `default` (AI/reports) queues.
