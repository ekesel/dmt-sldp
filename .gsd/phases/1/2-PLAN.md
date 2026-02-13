---
phase: 1
plan: 2
wave: 1
---

# Plan 1.2: Security Hardening

## Objective
Implement production-grade security settings to protect multi-tenant data and ensure secure transport.

## Context
- backend/core/settings.py
- .gsd/SPEC.md

## Tasks

<task type="auto">
  <name>Harden Security Middleware & Cookies</name>
  <files>backend/core/settings.py</files>
  <action>
    - Configure `SECURE_BROWSER_XSS_FILTER`, `SECURE_CONTENT_TYPE_NOSNIFF`, `X_FRAME_OPTIONS`.
    - Set `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, and `SECURE_SSL_REDIRECT` to True if `PRODUCTION` environment variable is 'True'.
    - Configure `CORS_ALLOWED_ORIGINS` to be fetched from `os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')`.
  </action>
  <verify>grep "SECURE_SSL_REDIRECT" backend/core/settings.py</verify>
  <done>Security settings are environmentally conditional and hardened.</done>
</task>

<task type="auto">
  <name>Final Security & Deployment Audit</name>
  <files>backend/core/settings.py</files>
  <action>
    - Run `python manage.py check --deploy` (simulated check).
    - Ensure `ALLOWED_HOSTS` is restricted via environment variable.
  </action>
  <verify>python backend/manage.py check --deploy</verify>
  <done>Django's deployment check passes without critical security warnings.</done>
</task>

## Success Criteria
- [ ] `ALLOWED_HOSTS` is no longer `['*']` by default.
- [ ] CSRF and Session cookies are configured for secure transport in production mode.
- [ ] `python manage.py check --deploy` returns a clean bill of health for core settings.
