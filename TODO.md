# TODO.md

## Critical Path: Company Portal Implementation (Phase 10)

### Backend Development
- [ ] **Dashboard API**: Implement `summary`, `velocity`, `throughput`, `defect-density`, `compliance`, `blocked-items`, `pr-health` endpoints in `backend/data/views.py`.
- [ ] **Metrics API**: Implement `developers`, `developers/{id}/metrics`, `me/metrics` endpoints.
- [ ] **Compliance API**: Implement `compliance-flags` list and resolve actions.
- [ ] **Notifications API**: Implement list, read, unread-count endpoints in `backend/notifications`.
- [ ] **Export API**: Implement data export endpoints.

### Frontend Development (`frontend/apps/app`)
- [ ] **Dashboard UI**: Connect KPI cards and charts to real backend APIs. Remove mocks.
- [ ] **Metrics UI**: Implement developer list and detail views with real data.
- [ ] **Compliance UI**: Implement compliance flag list with resolve actions.
- [ ] **Navigation**: Ensure sidebar/topbar navigation works correctly.
- [ ] **Authentication**: Verify login flow and token handling for company users.

## Backlog / Future
- [ ] **Typed Telemetry**: Migrate internal message bus to strictly typed models.
- [ ] **GitHub Author Resolution**: Map GitHub usernames to internal `DMT-User` identities.
- [ ] **Infrastructure**: Configure Docker environment for scaling.
- [ ] **Performance**: Redis caching for heavy dashboard queries.
