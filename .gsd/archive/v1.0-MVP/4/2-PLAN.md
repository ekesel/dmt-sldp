---
phase: 4
plan: 2
wave: 1
---

# Plan 4.2: Company Portal Dashboard Shell & Analytics Charts

## Objective
Establish the high-fidelity frontend dashboard for the Company Portal.

## Tasks
<task type="auto">
  <name>Dashboard Layout & Navigation</name>
  <files>
    - frontend/app/app/dashboard/layout.tsx
    - frontend/app/app/dashboard/page.tsx
  </files>
  <action>Create the main dashboard shell with navigation and basic layout using Tailwind CSS.</action>
  <verify>Run 'npm run dev' and inspect the dashboard landing page.</verify>
  <done>Dashboard structure is functional and visually consistent.</done>
</task>

<task type="auto">
  <name>Analytics Visualization</name>
  <files>
    - frontend/app/components/charts/ComplianceChart.tsx
    - frontend/app/components/metrics/MetricCard.tsx
  </files>
  <action>Implement data-driven charts and cards for DMT metrics and velocity.</action>
  <verify>Check component rendering with mock data props.</verify>
  <done>Analytics components are ready for dynamic data.</done>
</task>

## Verification
- Visual inspection of dashboard components.
- Responsive layout check across screen sizes.
