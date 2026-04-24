## Project Overview
This repository is a full-stack monorepo with:
- `backend/`: Django 4.2 app using `django-tenants`, DRF, Channels, Celery, Redis, and PostgreSQL
- `frontend/`: Next.js 16 + React 18 + TypeScript workspace monorepo
  - `apps/*`: frontend apps
  - `packages/*`: shared packages such as `@dmt/api` and `@dmt/ui`

## Key Directories
- `backend/core/`: Django settings, ASGI/WSGI, middleware, URLs
- `backend/users/`, `backend/tenants/`, `backend/newsapp/`, `backend/notifications/`: main domain apps
- `frontend/apps/`: user-facing frontend applications
- `frontend/packages/api/`: shared API/websocket utilities
- `frontend/packages/ui/`: shared UI components

## Additional Instructions
- For Code review related task refer ai-docs/patter/review-patter