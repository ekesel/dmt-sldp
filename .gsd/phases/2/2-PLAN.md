---
phase: 2
plan: 2
wave: 1
---

# Plan 2.2: Real Gemini AI Integration

## Objective
Promote the AI service from mock to a real Google Gemini/Vertex AI integration providing actionable DMT insights.

## Context
- .gsd/phases/2/RESEARCH.md
- backend/data/ai/prompts.py
- .gsd/SPEC.md

## Tasks

<task type="auto">
  <name>Implement Gemini AI Service</name>
  <files>
    - backend/data/ai/service.py
    - backend/data/ai/prompts.py
  </files>
  <action>
    - Create `backend/data/ai/service.py` with `GeminiAIProvider` class.
    - Implement LLM call using `google.generativeai` (or `google-cloud-aiplatform`).
    - Use strict JSON prompting to ensure parsable output for `AIInsight` model.
    - Refine `prompts.py` for better metric-to-insight mapping.
  </action>
  <verify>test -f backend/data/ai/service.py</verify>
  <done>AIService is implemented with a real LLM integration.</done>
</task>

<task type="auto">
  <name>Finalize AI Insight Pipeline</name>
  <files>backend/data/ai/tasks.py</files>
  <action>
    - Update `refresh_ai_insights` to aggregate real data:
      - Compliance rate.
      - Cycle time (resolved_at - created_at).
      - Risk counts (non-compliant items).
    - Call the real `AIService` and store the result in `AIInsight` model.
  </action>
  <verify>grep "AIInsight.objects.create" backend/data/ai/tasks.py</verify>
  <done>AI insights are generated based on actual project metrics.</done>
</task>

## Success Criteria
- [ ] `AIInsight` objects are successfully generated using the LLM.
- [ ] Suggestions and Forecasts follow the schema defined in `models.py`.
