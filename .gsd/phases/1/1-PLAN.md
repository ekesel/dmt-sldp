---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Environment Parity

## Objective
Remove hardcoded URLs and secrets by centralizing configuration in environment variables for both backend and frontend.

## Context
- .gsd/SPEC.md
- backend/core/settings.py
- frontend/app/hooks/useDashboardData.ts

## Tasks

<task type="auto">
  <name>Centralize Backend Configuration</name>
  <files>
    - backend/core/settings.py
    - .env.example
  </files>
  <action>
    - Create `.env.example` with placeholders for `DJANGO_SECRET_KEY`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `REDIS_URL`, `PRODUCTION`.
    - Modify `backend/core/settings.py` to use `os.environ.get()` for all these values.
    - Set `DEBUG = os.environ.get('PRODUCTION', 'False') != 'True'`.
  </action>
  <verify>grep "os.environ.get" backend/core/settings.py</verify>
  <done>Backend settings are no longer hardcoded and `.env.example` exists.</done>
</task>

<task type="auto">
  <name>Refactor Frontend Environment Hooks</name>
  <files>
    - frontend/app/hooks/useDashboardData.ts
    - frontend/app/hooks/useWebSocket.ts
  </files>
  <action>
    - Refactor `useDashboardData.ts` to use `process.env.NEXT_PUBLIC_WS_URL` instead of the hardcoded `backend` host.
    - Add `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to `.env.example`.
  </action>
  <verify>grep "process.env" frontend/app/hooks/useDashboardData.ts</verify>
  <done>Frontend no longer contains hardcoded backend URLs.</done>
</task>

## Success Criteria
- [ ] `.env.example` contains all necessary keys for local and production-like setup.
- [ ] Backend and Frontend codebases are free of hardcoded environment-specific URLs.
