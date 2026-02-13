---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: AI Service & Prompt Engineering

## Objective
Implement the backend foundation for generating AI-powered insights from tenant data.

## Tasks
<task type="auto">
  <name>AI Service Foundation</name>
  <files>
    - backend/data/ai/service.py
    - backend/data/ai/prompts.py
  </files>
  <action>Implement the LLM client wrapper and system prompt templates for compliance and velocity analysis.</action>
  <verify>Run a standalone test script passing dummy metrics and checking prompt output.</verify>
  <done>Service can generate formatted prompts and call the LLM API.</done>
</task>

<task type="auto">
  <name>Insight Refresh Task</name>
  <files>
    - backend/data/ai/tasks.py
    - backend/data/models.py
  </files>
  <action>Add an AIInsight model and a Celery task to periodically refresh insights for tenants.</action>
  <verify>Trigger task via shell and check for new AIInsight records in the DB.</verify>
  <done>Insights are automatically generated and stored.</done>
</task>

## Verification
- Unit tests for prompt interpolation.
- Successful insight generation in development environment (using mock LLM if key missing).
