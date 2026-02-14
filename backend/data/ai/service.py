import os
import json
import logging
import time
import random
from google.api_core import exceptions
from google.cloud import aiplatform
from vertexai.generative_models import GenerativeModel, GenerationConfig
from .prompts import COMPLIANCE_INSIGHT_SYSTEM_PROMPT, TEAM_HEALTH_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

class GeminiAIProvider:
    """
    Provider for Google Gemini LLM via Vertex AI.
    """
    def __init__(self):
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
        
        self._consecutive_failures = 0
        self._circuit_breaker_until = None
        
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

        # Circuit breaker check
        if self._circuit_breaker_until and time.time() < self._circuit_breaker_until:
            logger.warning("AI circuit breaker is OPEN. Skipping API call.")
            return self._get_fallback_insight()

        prompt = COMPLIANCE_INSIGHT_SYSTEM_PROMPT.format(
            compliance_rate=metrics.get("compliance_rate", 0),
            avg_cycle_time=metrics.get("avg_cycle_time", "N/A"),
            high_risk_count=metrics.get("high_risk_count", 0)
        )

        for attempt in range(1, 4):
            try:
                response = self.model.generate_content(
                    prompt,
                    generation_config=GenerationConfig(
                        response_mime_type="application/json",
                    )
                )
                
                # Success: reset circuit breaker state
                self._consecutive_failures = 0
                self._circuit_breaker_until = None
                
                return json.loads(response.text)
            except Exception as e:
                self._consecutive_failures += 1
                logger.error(f"AI generation failed (attempt {attempt}): {e}")

                # Trip circuit breaker if too many consecutive failures
                if self._consecutive_failures >= 5:
                    self._circuit_breaker_until = time.time() + 300  # 5 minutes
                    logger.critical("AI circuit breaker TRIPPED.")
                    break

                if attempt < 3:
                    # Exponential backoff with jitter
                    delay = (2 ** attempt) + random.uniform(0, 1)
                    logger.info(f"Retrying AI generation in {delay:.2f}s...")
                    time.sleep(delay)

        return self._get_fallback_insight()

    def generate_optimization_insights(self, metrics: dict):
        """
        Generates team health and bottleneck insights.
        """
        if not self.model:
            return self._get_fallback_insight()

        prompt = TEAM_HEALTH_SYSTEM_PROMPT.format(
            avg_cycle_time=metrics.get("avg_cycle_time", "N/A"),
            assignee_distribution=json.dumps(metrics.get("assignee_distribution", [])),
            stagnant_items=json.dumps(metrics.get("stagnant_items", []))
        )

        # Re-use generation logic or refactor
        return self._generate_json(prompt)

    def _generate_json(self, prompt: str):
        for attempt in range(1, 4):
            try:
                response = self.model.generate_content(
                    prompt,
                    generation_config=GenerationConfig(
                        response_mime_type="application/json",
                    )
                )
                self._consecutive_failures = 0
                return json.loads(response.text)
            except Exception as e:
                self._consecutive_failures += 1
                if attempt < 3:
                    time.sleep(2)
        return self._get_fallback_insight()

    def _get_fallback_insight(self):
        return {
            "summary": "AI Insight generation currently unavailable.",
            "suggestions": [],
            "forecast": "N/A"
        }
