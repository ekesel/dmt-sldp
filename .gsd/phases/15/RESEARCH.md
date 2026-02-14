# Research: Phase 15 - Portal Implementation

## 1. Functional Requirements

### Admin Portal (`apps/admin`)
- **Tenant Management**: CRUD for `Tenant` model in public schema.
- **Project Management**: CRUD for `Project` model.
- **Source Configuration**:
    - Manage `SourceConfiguration` per project.
    - **Discovery**: Call `/api/admin/sources/{id}/discover` to auto-map fields.
    - **Sync Control**: Trigger manual ETL or historical imports.
- **System Health**: View queue depths and last sync statuses.

### Company Portal (`apps/app`)
- **Dashboards**:
    - **KPI Cards**: Sprint Velocity, Cycle Time, Compliance Rate, Blockers.
    - **Chart**: Recharts-based velocity and throughput trends.
- **Individual Metrics**: Developer-level productivity and quality insights.
- **Compliance Flags**: Filterable table of `ComplianceFlag` records with "Resolve" action.

## 2. Shared Packages

### `packages/api` (New)
- **Objective**: Centralized axios client with multi-tenancy support.
- **Features**:
    - Interceptor to add `X-Tenant` or handle JWT auth.
    - Type-safe hooks (using React Query) for all endpoints defined in PRD Section 4.

## 3. Tech Stack Integration
- **State Management**: **TanStack Query (React Query)** for server state.
- **Routing**: Next.js 14 App Router (already scaffolded).
- **Icons**: Lucide React.
- **Charts**: Recharts.

## 4. Implementation Strategy
1. **Wave 1**: Create `packages/api` and implement core Admin CRUDs (Tenants, Projects).
2. **Wave 2**: Implement Source Configuration (Discovery/Sync) and Health Monitor.
3. **Wave 3**: Build out Company Portal dashboards and Compliance Flag management.
