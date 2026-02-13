---
phase: 6
plan: 1
wave: 1
gap_closure: true
---

# Plan 6.1: AI Resilience Solidification

## Objective
Implement robust error handling, exponential backoff, and circuit breakers for the `GeminiAIProvider` to ensure system stability during API outages or rate limiting.

## Context
- backend/data/ai/service.py
- .gsd/milestones/v1.1-AUDIT.md

## Tasks

<task type="auto">
  <name>Implement Exponential Backoff</name>
  <files>backend/data/ai/service.py</files>
  <action>
    - Import `time` and `random`.
    - Wrap `model.generate_content` in a retry loop (max 3 retries).
    - Use exponential backoff: `2^retry + random_jitter`.
    - Handle `google.api_core.exceptions.ResourceExhausted` specifically.
  </action>
  <verify>grep "retry" backend/data/ai/service.py</verify>
  <done>AI provider handles rate limits gracefully with retries.</done>
</task>

<task type="auto">
  <name>Add Circuit Breaker State</name>
  <files>backend/data/ai/service.py</files>
  <action>
    - Add `_consecutive_failures` counter to `GeminiAIProvider`.
    - If failures > 5, enter "Open" state for 5 minutes.
    - Directly return fallback during "Open" state without calling API.
  </action>
  <verify>grep "_consecutive_failures" backend/data/ai/service.py</verify>
  <done>AI provider prevents cascading failures during sustained outages.</done>
</task>

## Success Criteria
- [ ] Retries implemented for transient AI failures.
- [ ] Circuit breaker prevents API hammering during downtime.
