# Research: Phase 20 - AI Team Optimization

## Objective
Design an AI-driven bottleneck detection and team health optimization system using Gemini Pro.

## Findings

### 1. Bottleneck Detection Parameters
To effectively detect bottlenecks, we need to feed the following data to the LLM:
- **Stagnant Work Items**: Items in 'In Progress' for > 150% of the average cycle time.
- **Resource Saturation**: Number of active items per assignee.
- **Queueing Delay**: Average time items spend in 'To Do' before being picked up.

### 2. Prompt Engineering
The system prompt should focus on:
- Identifying outliers in cycle time.
- Detecting "Hero Culture" (one dev doing too much).
- Suggesting peer review or redistribution for stuck PRs.

### 3. Feedback Loop Design
To improve the AI over time, we need a feedback loop:
- **Schema**: Add a `status` field to the `suggestions` JSON array in `AIInsight` (values: `pending`, `accepted`, `rejected`).
- **Endpoint**: `PATCH /api/analytics/insights/suggestion/` to update the status.

### 4. Integration with Gemini
- Use **Gemini 1.5 Pro** for its large context window, allowing us to send more historical data (e.g., last 50 work items) for pattern recognition.

## Decisions
- Update the `AIInsight.suggestions` JSON structure to include a unique ID per suggestion for tracking feedback.
- Add a background task to recalculate "Team Health" whenever a new AI Insight is generated.
