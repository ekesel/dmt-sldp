# ROADMAP.md

> **Current Milestone**: v1.5 - Ecosystem Scale & Advanced Data Lifecycle
> **Goal**: Scaling to Enterprise needs with deep historical trends and hardened data retention.

## Current Position
- **Milestone**: v1.5 (Planned)
- **Status**: 🔄 In Progress - Scoping Phases

## Must-Haves
- [ ] **Historical Trending**: Persistent developer-level performance tracking over time.
- [ ] **Automated Archival**: Production-ready data retention engine (Cold Store).
- [ ] **Enterprise Reporting**: Cross-tenant report exports (PDF/CSV).
- [ ] **Workspace Aggregation**: Link multiple source workspaces into a single view.

## Phases

### Phase 12: Ecosystem Foundation
**Status**: ✅ Complete
**Objective**: Hardening internal messaging with Pydantic and preparing production orchestration.

### Phase 13: Identity & Attribution
**Status**: ✅ Complete
**Objective**: Implement cross-tool author resolution for granular productivity metrics.

### Phase 14: Frontend Core
**Status**: ✅ Complete
**Objective**: Initialize Next.js projects and unified design system.

### Phase 15: Portal Implementation
**Status**: ✅ Complete
**Objective**: Build out Admin and Company dashboards.

### Phase 16: v1.3 Verification Audit
**Status**: ✅ Complete and Verified
**Objective**: Holistic audit of UI launch and scaling capabilities.

### Phase 17: Milestone 1.3 Gap Closure
**Status**: ✅ Complete
**Objective**: Address technical debt and regression risks from v1.3 audit.

**Gaps to Close:**
- [x] Sanitize `TODO.md` to reflect current project reality.
- [x] Regression smoke test for portals on Next.js 16.
- [x] Roadmap session-based auth for Milestone 1.4.

### Phase 18: PRD Alignment & UI Solidification
**Status**: ✅ Complete and Verified
**Objective**: Synchronize codebase with PRD requirements and transition frontends from mocks to real-time integration.

**Key Deliverables:**
- [ ] **Audit Logging**: Immutable tracking for config changes in Public/Tenant schemas.
- [ ] **Notification System**: In-app notifications for compliance/ETL fails (Backend + WS).
- [ ] **Real-Time Integration**: Connect portals to Django REST/WebSocket APIs (Remove mocks).
- [ ] **UI/UX Overhaul**: Premium dashboard aesthetics, responsive fixes, and smooth micro-interactions.
- [ ] **Soft Deletes**: Implement `deleted_at` pattern for Tenants and WorkItems.

---

## Milestone v1.4 - Advanced Analytics & AI Insights
> **Goal**: Implement statistical delivery forecasting and AI-driven team optimization suggestions.

### Phase 19: Statistical Forecasting
**Status**: ✅ Complete
**Objective**: Build the statistical engine for predicting sprint completion and delivery dates based on historical velocity and cycle time.

**Key Deliverables:**
- [ ] **Forecasting Engine**: Implement Monte Carlo simulations for delivery date prediction.
- [ ] **Data Sanitization**: Statistical outlier detection for "stale" work items.
- [ ] **Visualizer**: Integrated "Confidence Interval" charts in the Company Portal.

### Phase 20: AI Team Optimization
**Status**: ✅ Complete
**Objective**: Leverage Gemini Pro for "Team Health" suggestions and bottleneck detection.

**Key Deliverables:**
- [ ] **Optimization Prompts**: Advanced prompt engineering for bottleneck analysis.
- [ ] **Actionable Insights**: Automated suggestions for pair programming or task redistribution.
- [ ] **Feedback Loop**: UI for users to confirm/reject AI suggestions.

---

## Milestone v1.5 - Ecosystem Scale & Advanced Data Lifecycle
> **Goal**: Hardening the enterprise features identified in the PRD audit.

### Phase 21: Developer Analytics & Trending
**Status**: ⬜ Not Started
**Objective**: Implement the `DeveloperMetrics` historical table for long-term efficiency scoring.
**Depends on**: Phase 13, Phase 20

### Phase 22: Archival & Lifecycle Engine
**Status**: ⬜ Not Started
**Objective**: Build the automated retention engine to archive stale data to S3/MinIO.
**Depends on**: Phase 18

### Phase 23: Enterprise Reporting Exports
**Status**: ⬜ Not Started
**Objective**: Implement CSV/PDF export endpoints for sprint and compliance reports.
**Depends on**: Phase 15

### Phase 24: Ecosystem Scale (Multi-Workspace)
**Status**: ⬜ Not Started
**Objective**: Support workspace-level aggregation for complex enterprise tenants.
**Depends on**: Phase 12

---

## Past Milestones

### v1.2 - Scalability & Deep Integration (Solidified)
- [x] Asynchronous Insights Engine
- [x] CI/CD Quality Gates
- [x] Jira OAuth2
- [x] Unified Analytics

### v1.1 - Production Readiness (Solidified)
- [x] Environment Parity
- [x] Security Hardening
- [x] Real AI Integration
- [x] Production WebSockets
- [x] GitHub Integration
- [x] AI Resilience & Compliance Hardening (Phase 6)
