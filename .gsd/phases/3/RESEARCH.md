# Research - Phase 3: Real-time Telemetry Rewrite

## Current State
- `SyncConsumer` exists but is manually triggered and lacks tenant validation beyond the URL parameter.
- WebSocket URL: `ws/sync/{tenant_id}/`.
- No signals are currently connected to the WebSocket broadcast logic.

## Proposed Secured Architecture

### 1. Connection Hardening
We must move from URL-based tenant identification to session-based validation.
- **Middleware**: Use `channels.auth.AuthMiddlewareStack`.
- **Validation**: In `connect()`, verify that `scope['user']` belongs to the tenant requested in the URL (or simply use the user's tenant directly).

### 2. Multi-tenant Signal Broadcast
We need to broadcast updates when data changes.
- **Targets**: `WorkItem`, `PullRequest`, `AIInsight`.
- **Groups**: Broadcast to `tenant_{tenant_id}` groups to prevent cross-talk.
- **Payloads**:
    - `metrics_update`: New compliance rates or cycle times.
    - `insight_ready`: Notification that a new AI Insight is available.
    - `sync_progress`: Live status of the connector sync.

### 3. Unified Dashboard Consumer
Rename/Refactor `SyncConsumer` to `TelemetryConsumer` to better reflect its role in streaming live dashboard metrics.

## Frontend Alignment
The `useDashboardData` hook expects `metrics_update` messages. We will standardize the message schema to:
```json
{
  "type": "metrics_update",
  "data": {
    "compliance_rate": 85.0,
    "avg_cycle_time": "3 days",
    "high_risk_count": 5
  }
}
```

## Django Signal Integration
We will add `backend/data/signals.py` to handle `post_save` hooks for `WorkItem` and `AIInsight`, triggering the `channel_layer` broadcast.
