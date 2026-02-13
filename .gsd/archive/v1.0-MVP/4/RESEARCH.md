# RESEARCH.md — Phase 4: AI Insights & Company Portal

## AI Insights Strategy (REQ-06)
- **Model**: Leverage Gemini Pro via Vertex AI (or OpenAI/Anthropic if configured).
- **Context Injection**: Each tenant's data (Velocity trends, Cycle Time, DMT compliance rates) will be aggregated and passed as context in a "System Prompt" to generate:
  - **Optimization Suggestions**: e.g., "Team X has high cycle time on stories without PR links; suggest tightening quality gates."
  - **Forecasting**: Predict sprint completion probability based on historical velocity and current scope.

## Company Portal Dashboard (REQ-09)
- **Framework**: Next.js with Tailwind CSS for high-fidelity UI.
- **Components**:
  - **Metric Cards**: Real-time display of DMT % and average Cycle Time.
  - **Trend Charts**: Visual representing progress over the last 5-10 sprints.
  - **AI Panel**: Interactive component showing the latest automated suggestions.
- **Data Fetching**: Use SWR or React Query for real-time dashboard updates via the analytics API.

## Technical Risks
- **Token Usage**: Need to summarize data before sending to AI to avoid context window issues.
- **Latency**: AI responses might be slow; use background processing or pre-calculation for common insights.
