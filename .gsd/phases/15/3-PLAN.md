---
phase: 15
plan: 3
wave: 2
---

# Plan 15.3: Company Dashboards (KPIs & Trends)

## Objective
Implement the main Company Portal dashboard with KPI cards and Recharts-based trend visualization.

## Context
- [.gsd/phases/15/RESEARCH.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/.gsd/phases/15/RESEARCH.md)
- [frontend/packages/ui/](file:///Users/ekesel/Desktop/projects/DMT-SLDP/frontend/packages/ui/)

## Tasks

<task type="auto">
  <name>Implement KPI Dashboard Cards</name>
  <files>
    <file>frontend/apps/app/app/dashboard/page.tsx</file>
    <file>frontend/apps/app/components/KPISection.tsx</file>
  </files>
  <action>
    1. Build normalized KPI components for Velocity, Cycle Time, and Compliance.
    2. Authenticate and fetch aggregate metrics from `/api/dashboard/summary`.
  </action>
  <verify>ls frontend/apps/app/components/KPISection.tsx</verify>
  <done>Dasboard displays real-time KPIs for the current tenant.</done>
</task>

<task type="auto">
  <name>Implement Trend Charts</name>
  <files>
    <file>frontend/apps/app/components/charts/VelocityChart.tsx</file>
  </files>
  <action>
    1. Integrated Recharts to visualize historical velocity and throughput.
    2. Fetch trend data from `/api/dashboard/velocity`.
    3. Ensure aesthetics match the "premium" glassmorphism theme.
  </action>
  <verify>ls frontend/apps/app/components/charts/VelocityChart.tsx</verify>
  <done>Dashboards include interactive charts for sprint trends.</done>
</task>

## Success Criteria
- [ ] Dashboard renders dynamic data for velocity and cycle time.
- [ ] Charts are responsive and visually consistent with the design system.
