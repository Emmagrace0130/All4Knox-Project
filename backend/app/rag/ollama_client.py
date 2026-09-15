"""
Thin async client for the local Ollama service.

Supports both ways of reaching Ollama on this host (see .env.example):
  * direct to the host daemon  — http://host.docker.internal:11434, no auth
  * via the shared TLS proxy   — https://ollama.viridian.ise.utk.edu, BasicAuth
"""

from __future__ import annotations

from typing import Any, AsyncIterator

import httpx

from app.core.config import Settings


class OllamaError(RuntimeError):
    """Raised when Ollama is unreachable or returns an error."""


class OllamaClient:
    def __init__(self, settings: Settings) -> None:
        self._base = settings.ollama_base_url.rstrip("/")
        self._auth = settings.ollama_auth
        self._timeout = settings.ollama_timeout
        self._model = settings.ollama_model
        self._embed_model = settings.ollama_embedding_model

    def _client(self, timeout: float | None = None) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self._base,
            auth=self._auth,
            timeout=timeout or self._timeout,
        )

    async def health(self) -> dict[str, Any]:
        """Reachability plus whether our configured models are actually pulled."""
        try:
            async with self._client(timeout=10) as client:
                resp = await client.get("/api/tags")
                resp.raise_for_status()
                names = {m["name"] for m in resp.json().get("models", [])}
        except Exception as exc:  # noqa: BLE001 - surfaced to /health as a string
            return {"reachable": False, "error": str(exc)}

        return {
            "reachable": True,
            "baseUrl": self._base,
            "model": self._model,
            "modelAvailable": self._model in names,
            "embeddingModel": self._embed_model,
            "embeddingModelAvailable": self._embed_model in names,
        }

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts with the configured embedding model."""
        if not texts:
            return []
        async with self._client(timeout=300) as client:
            resp = await client.post(
                "/api/embed", json={"model": self._embed_model, "input": texts}
            )
            if resp.status_code >= 400:
                raise OllamaError(
                    f"embedding request failed ({resp.status_code}): {resp.text[:300]}"
                )
            data = resp.json()
        embeddings = data.get("embeddings")
        if not embeddings:
            raise OllamaError(f"no embeddings returned for {len(texts)} inputs")
        return embeddings

    @staticmethod
    def _options(overrides: dict[str, Any] | None) -> dict[str, Any]:
        """Drop unset keys so Ollama applies its own defaults for them."""
        base = {"temperature": 0.1}
        if overrides:
            base.update({k: v for k, v in overrides.items() if v is not None})
        return base

    @staticmethod
    def _record_usage(chunk: dict[str, Any], usage: dict[str, Any] | None) -> None:
        """Token counts from Ollama's final response, for checking the budget."""
        if usage is not None and "prompt_eval_count" in chunk:
            usage["promptTokens"] = chunk.get("prompt_eval_count")
            usage["outputTokens"] = chunk.get("eval_count")
            # "length" means the answer hit num_predict and was cut off.
            usage["doneReason"] = chunk.get("done_reason")

    async def chat(
        self,
        messages: list[dict[str, str]],
        options: dict[str, Any] | None = None,
        model: str | None = None,
        usage: dict[str, Any] | None = None,
    ) -> str:
        """Single-shot chat completion. Fills `usage` with token counts if given."""
        async with self._client() as client:
            resp = await client.post(
                "/api/chat",
                json={
                    "model": model or self._model,
                    "messages": messages,
                    "stream": False,
                    "options": self._options(options),
                },
            )
            if resp.status_code >= 400:
                raise OllamaError(
                    f"chat request failed ({resp.status_code}): {resp.text[:300]}"
                )
            data = resp.json()
        self._record_usage(data, usage)
        return (data.get("message") or {}).get("content", "")

    async def chat_stream(
        self,
        messages: list[dict[str, str]],
        options: dict[str, Any] | None = None,
        model: str | None = None,
        usage: dict[str, Any] | None = None,
    ) -> AsyncIterator[str]:
        """Token stream, so the demo shows an answer forming rather than a spinner."""
        import json as _json

        async with self._client() as client:
            async with client.stream(
                "POST",
                "/api/chat",
                json={
                    "model": model or self._model,
                    "messages": messages,
                    "stream": True,
                    "options": self._options(options),
                },
            ) as resp:
                if resp.status_code >= 400:
                    body = await resp.aread()
                    raise OllamaError(
                        f"chat stream failed ({resp.status_code}): {body[:300]!r}"
                    )
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = _json.loads(line)
                    except ValueError:
                        continue
                    piece = (chunk.get("message") or {}).get("content", "")
                    if piece:
                        yield piece
                    if chunk.get("done"):
                        self._record_usage(chunk, usage)
                        return
