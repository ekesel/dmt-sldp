# DECISIONS.md (ADR Log)

## ADR-001: Multi-tenant Architecture
**Status**: ACCEPTED
**Context**: Required high isolation for corporate data.
**Decision**: Use PostgreSQL schema-per-tenant strategy.
**Consequences**: Requires schema switching logic in Django and dynamic migration management.

## Phase 1 Decisions

**Date:** 2026-02-13

### Multi-tenancy
- **Chose**: `django-tenants` (Option A)
- **Reason**: Standard, robust library that simplifies schema management, domain handling, and migrations in a multi-tenant environment.

### Authentication & Portals
- **Portals**: Initialize both `Admin Portal` (admin.company.com) and `Company Portal` (app.company.com) as Next.js 14 applications.
- **Auth**: Standard JWT-based authentication for the MVP foundation.

### Infrastructure
- **Setup**: Standard `docker-compose` including Django, PostgreSQL, Redis, Celery, and Daphne.
- **CI/CD**: No CI/CD configuration required for Phase 1.

### Shared Data Handling
- **Constraint**: Cross-tenant data (users, tenants, projects) will be strictly managed in the `Public` schema to ensure data integrity and isolation.
