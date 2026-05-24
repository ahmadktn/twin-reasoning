"""
app/llm_provider.py
Abstract LLM interface + concrete implementations.
Toggle via config.USE_LOCAL_LLM or config.LLM_PROVIDER.
"""
from abc import ABC, abstractmethod
from typing import AsyncIterator
import httpx
from app.config import settings


class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> str: ...

    @abstractmethod
    async def stream(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> AsyncIterator[str]: ...


# ── OpenRouter (default — OpenAI-compatible, free tier available) ──────────────

class OpenRouterProvider(LLMProvider):
    def __init__(self):
        self.url = settings.LLM_BASE_URL
        self.model = settings.LLM_MODEL
        self.headers = {
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://bct-hackathon.com",
            "X-Title": "BCT Review Agent",
        }

    def _payload(self, prompt: str, max_tokens: int, temperature: float, stream: bool) -> dict:
        return {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": stream,
            "messages": [{"role": "user", "content": prompt}],
        }

    async def generate(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> str:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(self.url, json=self._payload(prompt, max_tokens, temperature, False), headers=self.headers)
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()

    async def stream(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> AsyncIterator[str]:
        import json
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", self.url, json=self._payload(prompt, max_tokens, temperature, True), headers=self.headers) as r:
                async for line in r.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        try:
                            chunk = json.loads(line[6:])
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            continue


# ── Anthropic ──────────────────────────────────────────────────────────────────

class AnthropicProvider(LLMProvider):
    def __init__(self):
        self.url = "https://api.anthropic.com/v1/messages"
        self.model = settings.LLM_MODEL or "claude-haiku-4-5-20251001"
        self.headers = {
            "x-api-key": settings.LLM_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

    async def generate(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> str:
        payload = {"model": self.model, "max_tokens": max_tokens, "temperature": temperature,
                   "messages": [{"role": "user", "content": prompt}]}
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(self.url, json=payload, headers=self.headers)
            r.raise_for_status()
            return r.json()["content"][0]["text"].strip()

    async def stream(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> AsyncIterator[str]:
        import json
        payload = {"model": self.model, "max_tokens": max_tokens, "temperature": temperature,
                   "stream": True, "messages": [{"role": "user", "content": prompt}]}
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", self.url, json=payload, headers={**self.headers, "anthropic-version": "2023-06-01"}) as r:
                async for line in r.aiter_lines():
                    if line.startswith("data:"):
                        try:
                            event = json.loads(line[5:].strip())
                            if event.get("type") == "content_block_delta":
                                yield event["delta"].get("text", "")
                        except Exception:
                            continue


# ── Local (HuggingFace — lazy-loaded) ─────────────────────────────────────────

class LocalProvider(LLMProvider):
    _model = None
    _tokenizer = None

    def _load(self):
        if self._model:
            return
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
        print(f"[LocalLLM] Loading {settings.LOCAL_MODEL_NAME}...")
        self.__class__._tokenizer = AutoTokenizer.from_pretrained(settings.LOCAL_MODEL_NAME)
        self.__class__._tokenizer.pad_token = self.__class__._tokenizer.eos_token
        self.__class__._model = AutoModelForCausalLM.from_pretrained(
            settings.LOCAL_MODEL_NAME,
            quantization_config=BitsAndBytesConfig(load_in_8bit=True),
            device_map="auto", torch_dtype=torch.float16,
        )
        self.__class__._model.eval()

    async def generate(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> str:
        import asyncio, torch
        self._load()
        loop = asyncio.get_event_loop()
        def _run():
            inputs = self._tokenizer(prompt, return_tensors="pt").to(self._model.device)
            with torch.no_grad():
                out = self._model.generate(**inputs, max_new_tokens=max_tokens,
                                           temperature=temperature, do_sample=True,
                                           pad_token_id=self._tokenizer.eos_token_id)
            return self._tokenizer.decode(out[0], skip_special_tokens=True)[len(prompt):].strip()
        return await loop.run_in_executor(None, _run)

    async def stream(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> AsyncIterator[str]:
        # Local doesn't support token streaming; yield full response in one chunk
        result = await self.generate(prompt, max_tokens, temperature)
        yield result


# ── Factory ────────────────────────────────────────────────────────────────────

_instance: LLMProvider | None = None


def get_llm_provider() -> LLMProvider:
    global _instance
    if _instance:
        return _instance
    if settings.USE_LOCAL_LLM:
        _instance = LocalProvider()
    elif settings.LLM_PROVIDER == "anthropic":
        _instance = AnthropicProvider()
    else:
        _instance = OpenRouterProvider()
    return _instance
