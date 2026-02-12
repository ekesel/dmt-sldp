---
phase: 1
plan: 2
wave: 1
---

# Plan 1.2: Frontend Shells & Auth Foundation

## Objective
Initialize both Next.js applications (Admin & Company portals) and implement basic JWT-based authentication shells.

## Context
- .gsd/SPEC.md
- .gsd/DECISIONS.md
- backend/core/settings.py

## Tasks

<task type="auto">
  <name>Initialize Next.js Portals</name>
  <files>
    - frontend/admin/package.json
    - frontend/app/package.json
  </files>
  <action>
    1. Initialize Next.js 14 in `frontend/admin` (Admin Portal) using App Router, TypeScript, and Tailwind CSS.
    2. Initialize Next.js 14 in `frontend/app` (Company Portal) using App Router, TypeScript, and Tailwind CSS.
    3. Add basic project structure (components, lib, styles) to both.
  </action>
  <verify>cd frontend/admin && npm run build && cd ../app && npm run build</verify>
  <done>Both Next.js portals created and build successfully.</done>
</task>

<task type="auto">
  <name>Setup JWT Auth Skeleton</name>
  <files>
    - backend/users/models.py
    - backend/core/urls.py
  </files>
  <action>
    1. Create `users` app in Django.
    2. Implement Custom User model inheriting from `AbstractUser`.
    3. Configure `djangorestframework-simplejwt` in `settings.py`.
    4. Add login/refresh token endpoints to `core/urls.py`.
  </action>
  <verify>python backend/manage.py makemigrations users</verify>
  <done>Auth system integrated in Django and migrations generated.</done>
</task>

<task type="auto">
  <name>Update Docker for Frontend</name>
  <files>
    - docker-compose.yml
  </files>
  <action>
    1. Add `admin-portal` and `company-portal` services to `docker-compose.yml`.
    2. Setup volume mapping for hot-reloading in development.
  </action>
  <verify>docker-compose ps</verify>
  <done>Docker Compose includes all backend and frontend services.</done>
</task>

## Success Criteria
- [ ] Admin and Company portal landing pages accessible.
- [ ] Django API can issue JWT tokens for valid users.
- [ ] Docker environment runs 5+ containers (db, redis, backend, admin, company).
