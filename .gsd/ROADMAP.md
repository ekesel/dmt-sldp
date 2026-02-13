# ROADMAP.md

> **Current Phase**: Phase 1: Foundation & Multi-tenancy
> **Milestone**: v1.0 MVP

## Must-Haves (from SPEC)
- [x] Multi-tenant schema isolation (PostgreSQL).
- [x] Core ETL framework for one source (Jira).
- [x] DMT compliance calculation engine.
- [x] Basic Analytics Dashboard (Company Portal).
- [x] Tenant Management (Admin Portal).

## Phases

### Phase 1: Foundation & Multi-tenancy
**Status**: ✅ Complete
**Objective**: Establish core platform architecture, authentication, and multi-tenant isolation.
**Requirements**: REQ-01, REQ-08 (Basic), REQ-10 (Audit)

### Phase 2: Data Orchestration (ETL & Normalization)
**Status**: ✅ Complete
**Objective**: Build the integration layer for PM tools and git registries; implement the normalized data schema.
**Requirements**: REQ-02, REQ-03, REQ-05

### Phase 3: DMT & Analytics Engine
**Status**: ✅ Complete
**Objective**: Implement the quality enforcement logic (DMT) and calculate sprint/developer metrics.
**Requirements**: REQ-04, REQ-07

### Phase 4: AI Insights & Company Portal
**Status**: ✅ Complete
**Objective**: Launch the full company dashboard with AI-driven forecasting and suggestions.
**Requirements**: REQ-06, REQ-09

### Phase 5: Polish & Scaling
**Status**: ✅ Complete
**Objective**: Support remaining source types (ClickUp, Azure), refine UI/UX, and implement data retention jobs.
**Requirements**: REQ-08 (Advanced), REQ-10 (Retention)
