# RESEARCH: Phase 10 — Analytics & Aggregation

## Objective
Design a "data warehouse-style" aggregation layer to support historical reporting and cross-tenant visibility.

## Discovery Items

### 1. Data Points to Aggregate
- **DMT Compliance**: Percentage of work items marked compliant (Rule 1/2/3).
- **PR Velocity**: Average time from creation to merge.
- **Sprint Throughput**: Total completed items per sprint.
- **Quality Gates**: Success/failure ratio of CI/CD checks (linked to PRs).

### 2. Aggregation Strategy
- **Summary Tables**: Create new models in the `data` app specifically for snapshots.
- **Granularity**: Daily snapshots for time-series charts.
- **Tenant Context**: Since `data` is a `TENANT_APP`, aggregation will happen within each tenant schema.

### 3. Background Processing
- **Celery Beat**: Schedule a daily task to run `aggregate_tenant_metrics`.
- **Logic**: Query `WorkItem`, `PullRequest`, and `Sprint` tables to compute summary metrics for the previous 24 hours.

### 4. Database Models (Proposed)

#### DailyMetric
- `date`: DateField (Unique for tenant)
- `total_work_items`: Integer
- `compliant_work_items`: Integer
- `compliance_rate`: Float (compliant / total)
- `avg_cycle_time_hours`: Float (time to resolve)
- `prs_merged_count`: Integer

#### HistoricalSprintMetric
- `sprint`: ForeignKey(Sprint)
- `velocity`: Integer (Story points or count)
- `final_compliance_rate`: Float
- `ai_efficiency_score`: Float (calculated from DMT signals)

### 5. Celery Task Flow
1. `run_daily_aggregation`: Dispatched by Beat at 00:00.
2. Interates over all tenants using `Tenant.objects.all()`.
3. Calls `aggregate_tenant_metrics.delay(tenant.id)`.
4. `aggregate_tenant_metrics`:
   - Switches to tenant schema.
   - Calculates metrics for `T-1` day.
   - Upserts into `DailyMetric`.
