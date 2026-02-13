# Research - Phase 2: AI Service Promotion

## AI Provider: Google Gemini (Vertex AI)

### Library Selection
We will use `google-cloud-aiplatform` for robust access to Gemini models via Vertex AI. This allows for enterprise-grade deployments and better scalability than the developer-api-only SDK.

**Installation**:
```bash
pip install google-cloud-aiplatform
```

**Authentication**:
Requires `GOOGLE_APPLICATION_CREDENTIALS` (JSON key path) or environment variables for the API Key if using the direct Gemini API. We will favor environment-based API Key config for simplicity in this phase, as defined in SPEC.md.

### Service Architecture
The `AIService` will follow a Strategy-ready pattern to allow future provider switching.

- `GeminiProvider`: Handles the actual call to `google.generativeai` or `vertexai`.
- `InsightGenerator`: High-level logic that gathers metrics and formats prompts.

### Data Requirements for Prompts
To provide meaningful insights, we need to pass the following metrics to the LLM:
1. **DMT Compliance Rate**: (Compliant Items / Total Items) * 100.
2. **Cycle Time Trend**: Average time to resolve items over the last 30 days.
3. **Quality Risks**: Count of items failing specific DMT checks (e.g., missing PRs).

### Prompt Template
We will use the existing `prompts.py` but expand it to include historical context if available.

### Output Parsing
The model `AIInsight` expects:
- `summary`: text
- `suggestions`: JSON list of {title, impact, description}
- `forecast`: text

We will use "JSON mode" or strict schema prompting to ensure the LLM returns parsable data.

## Missing Foundation: Compliance Engine
Since the `ComplianceEngine` mentioned in `tasks.py` is missing, we must implement a basic version that evaluates `WorkItem` objects based on:
- Presence of a linked `PullRequest`.
- Status being 'Done' or 'Resolved'.
- (Future) Coverage metrics from source.
