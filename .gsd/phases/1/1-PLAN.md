---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Backend & Multi-tenancy Foundation

## Objective
Initialize the Django 5 project with `django-tenants` for schema-level multi-tenancy and set up the Docker development environment.

## Context
- .gsd/SPEC.md
- .gsd/REQUIREMENTS.md
- .gsd/DECISIONS.md
- PRD.md

## Tasks

<task type="auto">
  <name>Initialize Django Project & Dependencies</name>
  <files>
    - backend/requirements.txt
    - backend/core/settings.py
    - backend/core/urls.py
  </files>
  <action>
    1. Create `backend/requirements.txt` with Django 5.x, `django-tenants`, `psycopg2-binary`, `django-rest-framework`, `django-cors-headers`.
    2. Initialize Django project in `backend/` directory.
    3. Configure `settings.py` for `django-tenants`:
       - Add `django_tenants` to `INSTALLED_APPS`.
       - Define `SHARED_APPS` and `TENANT_APPS`.
       - Set `DATABASE_ROUTERS = ['django_tenants.routers.TenantSyncRouter']`.
       - Configure `DATABASES` for PostgreSQL with the `django_tenants.postgresql_backend`.
  </action>
  <verify>python backend/manage.py check</verify>
  <done>Django project initializes without errors and dependencies are locked.</done>
</task>

<task type="auto">
  <name>Define Base Tenant Models</name>
  <files>
    - backend/tenants/models.py
    - backend/tenants/admin.py
  </files>
  <action>
    1. Create `tenants` app.
    2. Define `Tenant` model inheriting from `TenantMixin`.
    3. Define `Domain` model inheriting from `DomainMixin`.
    4. Register models in `admin.py`.
  </action>
  <verify>python backend/manage.py makemigrations tenants</verify>
  <done>Tenant and Domain models created and migration files generated.</done>
</task>

<task type="auto">
  <name>Dockerize Environment</name>
  <files>
    - Dockerfile
    - docker-compose.yml
    - .env
  </files>
  <action>
    1. Create a `Dockerfile` for the Django backend.
    2. Create `docker-compose.yml` with `db` (Postgres 15), `redis`, and `backend` services.
    3. Configure environment variables for database connectivity in `.env`.
  </action>
  <verify>docker-compose config</verify>
  <done>Docker configuration is valid and services are defined.</done>
</task>

## Success Criteria
- [ ] Django backend running inside Docker.
- [ ] `django-tenants` middleware successfully switching schemas based on domain.
- [ ] Base migrations for the `Public` schema (tenants, domains) applied.
