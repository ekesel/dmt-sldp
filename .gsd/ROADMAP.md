# ROADMAP.md

> **Current Milestone**: v1.1 - Production Readiness
> **Goal**: Hardening the DMT-SLDP platform for production rollout by replacing mock services with functional integrations and securing the multi-tenant architecture.

## Must-Haves (from PRD & Audit)
- [ ] **Real AI Integration**: Replace mock `AIService` with Google Gemini/Vertex AI provider as per PRD Section 2.2.
- [ ] **Production WebSockets**: Implement full multi-tenant telemetry logic in `backend/data/consumers.py`.
- [ ] **Security Hardening**: Implement CSRF, Secure Cookies, and CORS policies across all schemas.
- [ ] **Environment Parity**: Refactor frontend/backend to use `.env` for all URLs and API keys (no hardcoding).
- [ ] **GitHub Integration**: Add the GitHub source connector as specified in PRD Section 5.1.

## Phases

### Phase 1: Security & Environment Hardening
**Status**: ✅ Complete
**Objective**: Secure the platform and remove all hardcoded configurations to enable deployment flexibility.
**Requirements**: REQ-SEC-01 (CORS/CSRF), REQ-ENV-01 (Dotenv refactor)

### Phase 2: AI Service Promotion
**Status**: ✅ Complete
**Objective**: Transition from mock predictions to real LLM-powered insights and forecasting.
**Requirements**: REQ-AI-01 (Gemini Integration)

### Phase 3: Real-time Telemetry Rewrite
**Status**: ✅ Complete
**Objective**: Finalize the WebSocket consumers to stream live data without tenant cross-talk.
**Requirements**: REQ-WS-01 (Telemetry Stream)

### Phase 4: Git Source Expansion (GitHub)
**Status**: ✅ Complete
**Objective**: Implement the GitHub connector to broaden the SLDP coverage.
**Requirements**: REQ-EXT-01 (GitHub API Client)

### Phase 5: Final Production Audit
**Status**: ✅ Complete
**Objective**: verify all success criteria from PRD Section 2.8 in a production-like environment.

### Phase 6: Gap Closure (Solidification)
**Status**: ✅ Complete
**Objective**: Address critical technical debt in AI and Compliance layers.

**Gaps to Close:**
- [x] AI Resilience (Exponential Backoff/Circuit Breakers)
- [x] Compliance Engine Hardening (Signal-based status)
