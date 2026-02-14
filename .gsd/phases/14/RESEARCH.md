# Research: Phase 14 - Frontend Core

## 1. Monorepo Architecture

### Problem
The current frontend structure is fragmented with redundant `package.json` files in `frontend/`, `frontend/admin`, and `frontend/app`. This makes it difficult to share a "unified design system" and common logic (authentication, API clients) between the two portals.

### Solution: NPM Workspaces
We will adopt an NPM Workspaces monorepo structure.

```text
frontend/
├── package.json (root with workspaces: ["packages/*", "apps/*"])
├── apps/
│   ├── admin/ (Admin Portal)
│   └── app/   (Company Portal)
└── packages/
    ├── ui/    (Shared Design System / Components)
    ├── auth/  (Shared Authentication Logic)
    └── api/   (Shared API Client / Types)
```

## 2. Design System Strategy

### Objective
A stunning, premium first impression as per [PRD.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/PRD.md).

### Choices
- **UI Components**: Use **Tailwind CSS** as the primary styling engine.
- **Icons**: **Lucide React** for clean, modern iconography.
- **Typography**: **Inter** or **Outfit** as global fonts.
- **Charts**: **Recharts** for the analytics dashboards.

### Shared `ui` Package
The `ui` package will export high-quality, reusable components (Buttons, Cards, Modals, Layouts) with a consistent "glassmorphism" aesthetic.

## 3. Authentication & API Integration

### Strategy
- **Authentication**: JWT-based auth stored in `HttpOnly` cookies (if possible) or local storage with a shared `useAuth` hook.
- **API Client**: Axios or Fetch with a shared base configuration in the `api` package, handling multi-tenant headers (`X-Tenant`).

## 4. Initialization Plan
1. Refactor directory structure to monorepo layout.
2. Setup root workspace dependencies.
3. Initialize the `ui` package with Tailwind configuration.
4. Scaffold `admin` and `app` using Next.js 14 App Router.
