# TODO.md — Technical Debt & Deferred Items

## Technical Debt (High Priority)
- [ ] **AI Resilience**: Implement exponential backoff and circuit breakers for `GeminiAIProvider` in `backend/data/ai/service.py`. Currently lacks robust error handling for API rate limits.
- [ ] **Compliance Engine Hardening**: Extend `ComplianceEngine` rules in `backend/data/engine/compliance.py` to check for specific PR merge status and CI/CD pass/fail signals. Current logic is "PR exists".

## Enhancements (v1.2)
- [ ] **Configurable Policy Engine**: Refactor compliance rules into a tenant-configurable policy engine instead of hardcoded class methods.
- [ ] **Typed Telemetry**: Formalize WebSocket message schemas into `TypedDict` or `pydantic` models for better frontend/backend synchronization.
- [ ] **GitHub Author Resolution**: Enhance `GitHubConnector` to resolve authors via GitHub API if the email is hidden in the PR payload.

## Maintenance
- [ ] **Retention Documentation**: Document the `cleanup_old_data` management command and its default retention periods.
- [ ] **Audit Logs**: Implement a multi-tenant audit logger for all configuration changes in `Integration` and `Tenant` models.
