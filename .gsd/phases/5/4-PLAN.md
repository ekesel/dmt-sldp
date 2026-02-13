---
phase: 5
plan: 4
wave: 2
---

# Plan 5.4: UI/UX Polish

## Objective
Replace mock data with real API integration, add charting library for visualizations, implement WebSocket real-time updates, and refine the Company Portal user experience.

## Context
- `.gsd/SPEC.md` — REQ-09 (Real-time dashboard updates)
- `.gsd/phases/4/` — Completed Company Portal foundation
- `frontend/app/app/dashboard/` — Dashboard components
- `frontend/app/hooks/useDashboardData.ts` — Data hook placeholder

## Tasks

<task type="auto">
  <name>Integrate Real API and WebSocket Updates</name>
  <files>frontend/app/hooks/useDashboardData.ts, frontend/app/hooks/useWebSocket.ts, frontend/app/app/dashboard/AIInsightsPanel.tsx</files>
  <action>
    Replace mock data with real backend API calls and WebSocket connections.
    
    1. Create `useWebSocket` hook in `frontend/app/hooks/useWebSocket.ts`:
       - Connect to `ws://backend/dashboard/stream`
       - Handle reconnection logic
       - Emit events for metric updates
    
    2. Update `useDashboardData` hook:
       - Replace mock setTimeout with `fetch('/api/dashboard/metrics')`
       - Subscribe to WebSocket for real-time updates
       - Update state when new data arrives
    
    3. Update `AIInsightsPanel`:
       - Fetch insights from `/api/ai/insights/latest`
       - Add refresh button that triggers API call
       - Display loading states during fetch
    
    AVOID implementing authentication in this task (assume JWT token in localStorage).
  </action>
  <verify>
    # Verify components can call API endpoints (will fail gracefully if backend not running)
    npm run build
  </verify>
  <done>Dashboard components fetch real data from API and listen to WebSocket updates</done>
</task>

<task type="auto">
  <name>Add Charting Library and Visualizations</name>
  <files>frontend/app/components/charts/ComplianceChart.tsx, frontend/package.json</files>
  <action>
    Implement interactive charts using Recharts library.
    
    1. Install Recharts: `npm install recharts`
    
    2. Update `ComplianceChart.tsx`:
       - Replace placeholder with `<LineChart>` showing compliance trend over time
       - Use sample data structure: `{date: '2024-01', compliance: 84.2}`
       - Add tooltips, axis labels, and responsive container
       - Use indigo-500 color for line, slate-800 for grid
    
    3. Create `CycleTimeChart.tsx`:
       - Bar chart showing average cycle time by week
       - Color bars by threshold: green (\u003c3 days), amber (3-5 days), red (\u003e5 days)
    
    Follow existing dark theme aesthetic (slate-950 background).
  </action>
  <verify>
    npm run build
  </verify>
  <done>Recharts integrated with ComplianceChart and CycleTimeChart displaying visualizations</done>
</task>

## Success Criteria
- [ ] Dashboard fetches real data from backend API endpoints
- [ ] WebSocket connection established for real-time metric updates
- [ ] Interactive charts render compliance and cycle time trends
