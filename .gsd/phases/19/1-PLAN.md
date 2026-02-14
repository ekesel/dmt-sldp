---
phase: 19
plan: 1
wave: 1
---

# Plan 19.1: Statistical Forecasting Engine

## Objective
Implement a robust Monte Carlo simulation engine to predict project delivery dates based on historical cycle time data.

## Context
- .gsd/phases/19/RESEARCH.md
- backend/data/models.py
- backend/data/analytics/metrics.py

## Tasks

<task type="auto">
  <name>Implement Monte Carlo Engine</name>
  <files>
    - backend/data/analytics/forecasting.py
    - backend/data/views.py
  </files>
  <action>
    - Create `forecasting.py` with a `ForecastingService` class.
    - Implement `simulate_delivery_dates(integration_id, num_items)` using NumPy.
    - Sample from historical `WorkItem` cycle times (resolved - created).
    - Return percentiles: 50th, 75th, 85th, 95th as dates.
    - Expose via a new endpoint `/api/analytics/forecast/`.
  </action>
  <verify>curl -H "X-Tenant: test_tenant" http://localhost:8000/api/analytics/forecast/?integration_id=1</verify>
  <done>Endpoint returns a JSON object with percentile dates based on historical data.</done>
</task>

<task type="checkpoint:human-verify">
  <name>Forecast Visualization</name>
  <files>
    - frontend/apps/app/app/dashboard/page.tsx
    - frontend/apps/app/components/charts/ForecastChart.tsx
  </files>
  <action>
    - Create `ForecastChart.tsx` using Recharts (AreaChart for probability density).
    - Fetch forecast data from the new endpoint in `DashboardPage`.
    - Display the 85th percentile "Safe Delivery" date prominently.
  </action>
  <verify>Visual verification of the Forecast Chart on the Company Portal dashboard.</verify>
  <done>User can see a probability distribution of delivery dates on the dashboard.</done>
</task>

## Success Criteria
- [ ] Statistical engine accurately samples from historical cycle times.
- [ ] Forecast dates are recalculated dynamically based on the latest 100 resolved items.
- [ ] Dashboard provides clear actionable dates for the 85th percentile.
