import os
import json
import logging
import time
import random
import requests
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
            velocity_history=json.dumps(metrics.get("velocity_history", [])),
            developer_history=json.dumps(metrics.get("developer_history", [])),
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

class KimiAIProvider:
    """
    Provider for Moonshot AI Kimi via NVIDIA Integrate API.
    """
    def __init__(self, api_key: str, model_name: str, base_url: str = None):
        self.api_key = api_key
        self.model_name = model_name or "moonshotai/kimi-k2.5"
        self.base_url = base_url or "https://integrate.api.nvidia.com/v1/chat/completions"
        self._consecutive_failures = 0
        self._circuit_breaker_until = None

    def generate_compliance_insights(self, metrics: dict):
        """
        Generates insights based on project metrics.
        """
        if not self.api_key:
            return self._get_fallback_insight()

        if self._circuit_breaker_until and time.time() < self._circuit_breaker_until:
            logger.warning("Kimi AI circuit breaker is OPEN. Skipping API call.")
            return self._get_fallback_insight()

        prompt = COMPLIANCE_INSIGHT_SYSTEM_PROMPT.format(
            compliance_rate=metrics.get("compliance_rate", 0),
            avg_cycle_time=metrics.get("avg_cycle_time", "N/A"),
            high_risk_count=metrics.get("high_risk_count", 0)
        )
        # Ensure it returns JSON format exactly as requested by the prompt
        prompt += "\n\nYou MUST return a single JSON object. Do not wrap in markdown blocks, just return raw JSON."

        return self._generate_json(prompt)

    def generate_optimization_insights(self, metrics: dict):
        """
        Generates team health and bottleneck insights.
        """
        if not self.api_key:
            return self._get_fallback_insight()

        prompt = TEAM_HEALTH_SYSTEM_PROMPT.format(
            avg_cycle_time=metrics.get("avg_cycle_time", "N/A"),
            velocity_history=json.dumps(metrics.get("velocity_history", [])),
            developer_history=json.dumps(metrics.get("developer_history", [])),
            assignee_distribution=json.dumps(metrics.get("assignee_distribution", [])),
            stagnant_items=json.dumps(metrics.get("stagnant_items", []))
        )
        prompt += "\n\nYou MUST return a single JSON object. Do not wrap in markdown blocks, just return raw JSON."

        return self._generate_json(prompt)

    def _generate_json(self, prompt: str):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        url = self.base_url
        if not url.endswith("/chat/completions"):
            if not url.endswith("/"):
                url += "/"
            url += "v1/chat/completions"

        payload = {
            "model": self.model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 1024,
            "chat_template_kwargs": {"thinking": True}
        }

        for attempt in range(1, 4):
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=300)
                response.raise_for_status()
                result_text = response.json()['choices'][0]['message']['content']
                
                # Cleanup markdown blocks if Kimi included them despite instructions
                result_text = result_text.strip()
                if result_text.startswith("```json"):
                    result_text = result_text[7:]
                if result_text.startswith("```"):
                    result_text = result_text[3:]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                
                parsed_json = json.loads(result_text.strip())
                
                self._consecutive_failures = 0
                self._circuit_breaker_until = None
                return parsed_json
                
            except Exception as e:
                self._consecutive_failures += 1
                logger.error(f"Kimi AI generation failed (attempt {attempt}): {e}")

                if self._consecutive_failures >= 5:
                    self._circuit_breaker_until = time.time() + 300
                    logger.critical("Kimi AI circuit breaker TRIPPED.")
                    break

                if attempt < 3:
                    delay = (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(delay)

        return self._get_fallback_insight()

    def _get_fallback_insight(self):
        return {
            "summary": "Kimi AI Insight generation currently unavailable.",
            "suggestions": [],
            "forecast": "N/A"
        }
