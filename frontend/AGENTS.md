# Frontend Agent Guide

## Overview
This `frontend/` directory is a Next.js workspace monorepo for the DMT SLDP UI.

- Package manager: `npm`
- Framework: Next.js 16 + React 18 + TypeScript
- Styling: Tailwind CSS
- Workspace layout:
  - `apps/app`: main user-facing portal
  - `apps/admin`: admin portal
  - `packages/api`: shared API client, auth helpers, websocket helpers, caching/deduplication utilities
  - `packages/ui`: shared UI primitives and utility functions

## Quick Start
Run commands from `frontend/` unless a task is app-specific.

- Install dependencies: `npm install`
- Root dev server: `npm run dev`
- Root build: `npm run build`
- Root lint: `npm run lint`

App-specific commands:

- Main app dev: `cd apps/app && npm run dev`
- Admin app dev: `cd apps/admin && npm run dev`
  - Admin runs on port `3001`

## Structure
### `apps/app`
Main end-user portal.

- Uses the Next.js App Router
- Important directories:
  - `app/`: routes and route groups
  - `components/`: UI sections and widgets
  - `context/`: auth and shared client state
  - `hooks/`: dashboard, newsfeed, websocket, and data hooks
  - `lib/`: local utilities

### `apps/admin`
Admin-facing portal.

- Uses the Next.js App Router
- Important directories:
  - `app/`: routes, pages, and admin features
  - `app/components/`: admin UI components
  - `app/context/`: admin state providers
  - `app/hooks/`: admin-specific hooks

### `packages/api`
Shared frontend API layer.

- Exposes the shared Axios client
- Handles:
  - base URL resolution
  - JWT injection from `localStorage`
  - token refresh
  - automatic `X-Tenant` header behavior
  - request caching and deduplication

### `packages/ui`
Shared frontend UI utilities and primitives.

- Includes `cn()` and reusable components like `Card` and `Button`
- Check this package first before adding duplicate shared components

## Path Aliases
Both apps currently use these TypeScript aliases:

- `@dmt/api`: shared API package
- `@dmt/ui`: shared UI package
- `@/*`: current app-local files

Examples:

- `@/components/...` resolves inside the current app
- `@dmt/api` resolves to `frontend/packages/api/index.ts`
- `@dmt/ui` resolves to `frontend/packages/ui/index.tsx`

## API And Auth Notes
The shared API client lives in `packages/api/index.ts`.

- `NEXT_PUBLIC_API_URL` is the first-choice API base URL
- In the browser, local fallback is typically `http://localhost:8000/api/`
- Non-local browser fallback uses relative `/api/`
- Server-side fallback uses `NEXT_PUBLIC_API_URL_FALLBACK` or `http://backend:8000/api/`
- Access token key: `dmt-access-token`
- Refresh token key: `dmt-refresh-token`
- Requests may auto-add `X-Tenant` based on hostname unless already set

When changing auth or request behavior, review both the shared API package and the consuming app context/hooks.

## WebSocket Notes
Real-time flows appear to be handled from frontend hooks and the shared API/websocket layer.

- Check both the hook and backend event contract before changing socket behavior
- Watch for connection-open bootstrap behavior in hooks that fetch initial data
- Be careful not to introduce duplicate subscriptions or duplicate list appends

## Working Norms
- Prefer fixing code in shared packages when the behavior is truly shared
- Prefer app-local code when the UI or state is specific to one portal
- Preserve existing path aliases and workspace import style
- Avoid introducing duplicate components if `@dmt/ui` can hold the shared version
- Keep client/server component boundaries in mind when editing App Router files
- Include exception handling for code paths that can fail, especially API calls, async flows, parsing, and browser-dependent logic
- Add JSDoc-style descriptions for functions, components, and non-obvious complex logic
- Write the main exported function or component first, and place helper functions below it where practical
- Prefer `if/else` over ternary operators when writing or refactoring logic for readability
- Never use the `any` type in TypeScript code
- Always prefer strongly typed code with explicit interfaces, type aliases, typed props, and typed function signatures
- When changing logic, update related comments and JSDoc so documentation stays accurate
- In Tailwind class strings, do not use hardcoded pixel or rem values such as arbitrary `px`/`rem` utilities when a standard Tailwind utility exists
- Prefer semantic Tailwind sizing and typography classes such as `text-sm`, `text-base`, `p-4`, `gap-2`, `rounded-lg`, and similar scale-based utilities
- When styling UI, use theme colors only; do not introduce one-off hardcoded colors unless the existing theme already defines and uses them
- Do not edit generated `.next/` files
- Do not touch `node_modules/`

## Validation
After frontend changes, use the smallest relevant validation first.

- For shared package or cross-app changes:
  - `cd frontend && npm run lint`
  - `cd frontend && npm run build`
- For app-specific changes:
  - `cd frontend/apps/app && npm run lint`
  - `cd frontend/apps/admin && npm run lint`

If the change affects auth, websocket flows, or routing, verify in the browser as well.

## Common Gotchas
- The workspace has both root-level and app-level `package.json` files; run commands from the intended directory.
- Both apps use `strict: false` in TypeScript, so be extra careful with unsafe assumptions.
- Shared package changes can affect both `apps/app` and `apps/admin`.
- Tenant-aware requests may depend on hostname-derived `X-Tenant` behavior.
