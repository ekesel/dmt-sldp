---
phase: 4
plan: 3
wave: 2
---

# Plan 4.3: AI Insights UI & Real-time Integration

## Objective
Connect the frontend dashboard to the AI backend and enable real-time updates.

## Tasks
<task type="auto">
  <name>AI Insights Panel</name>
  <files>
    - frontend/app/app/dashboard/AIInsightsPanel.tsx
  </files>
  <action>Implement the UI component to display, refresh, and dismiss AI-generated suggestions.</action>
  <verify>Verify panel renders suggestions fetched from the backend API.</verify>
  <done>AI insights are visible and interactive on the dashboard.</done>
</task>

<task type="auto">
  <name>Real-time Dashboard Binding</name>
  <files>
    - frontend/app/hooks/useDashboardData.ts
  </files>
  <action>Implement hooks to subscribe to WebSocket updates and refresh chart/AI data automatically.</action>
  <verify>Trigger a data sync and observe the dashboard updating without refresh.</verify>
  <done>Dashboard reflects live data and AI insights.</done>
</task>

## Verification
- Full integration test: sync data -> AI triggers -> UI updates.
- Error handling for failed AI calls or WebSocket disconnects.
