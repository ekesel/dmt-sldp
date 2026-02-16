import requests
import json
import logging
from typing import Generator, Dict, Any, Optional

logger = logging.getLogger(__name__)

class AIClient:
    def __init__(self, api_key: str, base_url: str, model: str):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model

    def stream_chat(self, messages: list, temperature: float = 1.0) -> Generator[str, None, None]:
        if "kimi" in self.model or "moonshot" in self.model:
            return self._stream_kimi(messages, temperature)
        else:
            # Fallback or other providers
            yield "Provider not implemented"

    def _stream_kimi(self, messages: list, temperature: float) -> Generator[str, None, None]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "text/event-stream",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 16384,
            "temperature": temperature,
            "top_p": 1.00,
            "stream": True,
            # "chat_template_kwargs": {"thinking": True}, # Optional based on user sample
        }

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions", # Ensure base_url doesn't have trailing slash or fix logic
                headers=headers,
                json=payload,
                stream=True
            )
            response.raise_for_status()

            for line in response.iter_lines():
                if line:
                    decoded = line.decode("utf-8")
                    if decoded.startswith("data: "):
                        data_str = decoded[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            logger.error(f"Failed to decode JSON: {data_str}")
        except Exception as e:
            logger.error(f"AI Request Failed: {e}")
            yield f"Error: {str(e)}"
