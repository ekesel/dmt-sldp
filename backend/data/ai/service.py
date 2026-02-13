import os
import json
import logging
from google.cloud import aiplatform
from vertexai.generative_models import GenerativeModel, GenerationConfig
from .prompts import COMPLIANCE_INSIGHT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

class GeminiAIProvider:
    """
    Provider for Google Gemini LLM via Vertex AI.
    """
    def __init__(self):
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
        
        try:
            aiplatform.init(project=self.project_id, location=self.location)
            self.model = GenerativeModel("gemini-1.5-pro")
        except Exception as e:
            logger.error(f"Failed to initialize Vertex AI: {e}")
            self.model = None

    def generate_compliance_insights(self, metrics: dict):
        """
        Generates insights based on project metrics.
        """
        if not self.model:
            return self._get_fallback_insight()

        prompt = COMPLIANCE_INSIGHT_SYSTEM_PROMPT.format(
            compliance_rate=metrics.get("compliance_rate", 0),
            avg_cycle_time=metrics.get("avg_cycle_time", "N/A"),
            high_risk_count=metrics.get("high_risk_count", 0)
        )

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=GenerationConfig(
                    response_mime_type="application/json",
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"AI generation failed: {e}")
            return self._get_fallback_insight()

    def _get_fallback_insight(self):
        return {
            "summary": "AI Insight generation currently unavailable.",
            "suggestions": [],
            "forecast": "N/A"
        }
