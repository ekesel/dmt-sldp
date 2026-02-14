# ROADMAP.md

> **Current Milestone**: v1.3 - Ecosystem Expansion & UI Launch
> **Goal**: Launch Next.js portals and bridge data-identity gaps (attribution & typed telemetry).

## Current Position
- **Milestone**: v1.3 (Verified)
- **Status**: ✅ Milestone complete

## Must-Haves
- [x] **GitHub Author Resolution**: Map commit/PR metadata to internal platform users.
- [x] **Next.js Portal Deployment**: Skeleton and core dashboards for Admin/Company portals.
- [x] **Typed Telemetry**: Migrate internal message bus to strictly typed Pydantic models.
- [x] **Resilient Docker Scaling**: Multi-worker Celery and production-ready service orchestration.

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
**Status**: ⬜ Not Started
**Objective**: Leverage Gemini Pro for "Team Health" suggestions and bottleneck detection.

**Key Deliverables:**
- [ ] **Optimization Prompts**: Advanced prompt engineering for bottleneck analysis.
- [ ] **Actionable Insights**: Automated suggestions for pair programming or task redistribution.
- [ ] **Feedback Loop**: UI for users to confirm/reject AI suggestions.

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
