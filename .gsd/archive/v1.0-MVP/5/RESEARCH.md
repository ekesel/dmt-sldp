# Phase 5 Research: Additional Integrations & Data Retention

## ClickUp API Integration

### Authentication
- **OAuth 2.0** (recommended for multi-user apps): Full OAuth flow with user authorization
- **Personal API Tokens**: Suitable for testing/prototyping
- API tokens go in `Authorization` header

### Key API Capabilities
- **Workspaces/Teams**: Top-level organizational entities
- **Lists**: Container for tasks (similar to Jira projects)
- **Tasks**: Central work item with metadata (assignees, priority, due dates, custom fields)
- **Webhooks**: Real-time notifications for task creation, updates, status changes
  - Signed with secret key for security
  - Can subscribe to specific locations (Workspace, Space, Folder, List, Task)

### ETL Mapping Strategy
| ClickUp | DMT Normalized Model |
|---------|---------------------|
| Task | WorkItem |
| List | Project (via external_id) |
| Assignee | Developer (matched by email) |
| Status changes | WorkItem.status tracking |
| Custom Fields | Can map to DMT compliance fields |

## Azure Boards API Integration

### Authentication
- **Microsoft Entra ID OAuth** (recommended, replaces deprecated Azure DevOps OAuth)
- **PATs**: For development/testing only
- **Scopes**: `vso.work` (read), `vso.work_write` (read/write), `vso.work_full` (full access)

### Key API Capabilities
- **Work Items**: Core entities (User Story, Bug, Task, etc.)
- **WIQL (Work Item Query Language)**: SQL-like query language for fetching work items
  - POST to `/wit/wiql` endpoint
  - Returns work item IDs, then fetch full details
- **OAuth Flow**: Entra ID → Access token → REST API calls with Bearer token

### ETL Mapping Strategy
| Azure Boards | DMT Normalized Model |
|--------------|---------------------|
| Work Item | WorkItem |
| Project | Project |
| Assigned To | Developer |
| State | WorkItem.status |
| Pull Request links | PullRequest linkage |

## Data Retention Implementation

### Strategy
- **Celery Beat**: Schedule periodic cleanup tasks (preferable to system cron)
- **Chunked Deletion**: Delete in batches to avoid long-running locks and memory issues
- **Per-Tenant Policies**: Each tenant can have different retention periods

### Technical Approach
1. **Django Management Command**: `cleanup_old_data`
   - Iterate through tenants
   - Apply tenant-specific retention policies
   - Delete records older than retention period in 1000-row chunks
2. **Celery Beat Scheduler**: Run cleanup nightly (e.g., 2 AM)
3. **Retention Policy Model**:
   ```python
   class RetentionPolicy(models.Model):
       tenant = models.OneToOneField(Tenant)
       work_items_months = models.IntegerField(default=12)
       ai_insights_months = models.IntegerField(default=6)
       audit_logs_months = models.IntegerField(default=24)
   ```

### PostgreSQL Optimization
- Use tenant schema context (`connection.set_tenant()`)
- Batch deletes with LIMIT clause
- Add indexes on timestamp fields for efficient filtering

## UI/UX Refinements

### Company Portal Enhancements
- Real API integration (replace mock data)
- WebSocket connection for live updates
- Charting library integration (e.g., Recharts or Chart.js)
- Loading states and error handling
- Responsive design improvements

### Admin Portal Polish
- Tenant management UI improvements
- Integration health dashboard
- Retention policy configuration interface

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| ClickUp/Azure API rate limits | Implement exponential backoff, cache responses |
| OAuth token expiry | Store refresh tokens, implement auto-refresh logic |
| Large-scale data deletion performance | Chunked deletion with sleep intervals |
| Data retention compliance | Audit logging for all deletions, configurable grace periods |
