---
phase: 20
plan: 1
wave: 1
---

# Plan 20.1: AI Team Optimization Engine

## Objective
Implement AI-driven bottleneck detection and team health suggestions using Gemini Pro, including a feedback loop for continuous improvement.

## Context
- .gsd/phases/20/RESEARCH.md
- backend/data/ai/service.py
- backend/data/ai/prompts.py
- backend/data/ai/tasks.py

## Tasks

<task type="auto">
  <name>Implement Optimization Prompt & Engine</name>
  <files>
    - backend/data/ai/prompts.py
    - backend/data/ai/tasks.py
    - backend/data/ai/service.py
  </files>
  <action>
    - Define `TEAM_HEALTH_SYSTEM_PROMPT` in `prompts.py` focusing on bottlenecks and resource load.
    - Update `refresh_ai_insights` task to collect "stagnant" work items (In Progress > 5 days) and assignee distribution.
    - Modify `GeminiAIProvider` to include a `generate_optimization_insights` method using the new prompt.
    - Store suggestions with a unique `id` and `status: "pending"` in the JSON field.
  </action>
  <verify>Run `refresh_ai_insights` task manually and inspect the latest `AIInsight` object in Django shell.</verify>
  <done>AI suggests specific team-level optimizations (e.g., "Assignee X is overloaded") with structured IDs.</done>
</task>

<task type="auto">
  <name>Implement AI Feedback API</name>
  <files>
    - backend/data/views.py
    - backend/core/urls.py
  </files>
  <action>
    - Create `AIInsightFeedbackView` to handle `PATCH` requests on specific suggestions.
    - Update the `suggestions` JSON array in `AIInsight` to reflect user feedback (Accepted/Rejected).
    - Register route `/api/analytics/insights/feedback/`.
  </action>
  <verify>curl -X PATCH -d '{"insight_id": 1, "suggestion_id": "abc", "status": "accepted"}' http://localhost:8000/api/analytics/insights/feedback/</verify>
  <done>User feedback is persisted in the database for future prompt refinement.</done>
</task>

<task type="checkpoint:human-verify">
  <name>Insights Feedback UI</name>
  <files>
    - frontend/apps/app/app/dashboard/page.tsx
    - frontend/apps/app/components/AIInsightsList.tsx
  </files>
  <action>
    - Create `AIInsightsList.tsx` component to render suggestions with Accept/Dismiss buttons.
    - Integrate the feedback API call into the buttons.
    - Display current "Bottleneck" status on the main dashboard.
  </action>
  <verify>Manually verify that clicking 'Accept' updates the visual state and persists to the backend.</verify>
  <done>User can interact with AI suggestions directly from the Company Dashboard.</done>
</task>

## Success Criteria
- [ ] AI correctly identifies work items stagnant for more than 5 days.
- [ ] Suggestions include unique IDs for tracking.
- [ ] Dashboard allows users to "Dismiss" or "Accept" AI suggestions.
