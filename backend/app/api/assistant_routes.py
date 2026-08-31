"""
"Ask All4Knox" assistant endpoints.

Every route degrades safely: when the assistant is disabled or Ollama is
unreachable the deterministic clinical tools are entirely unaffected, because
nothing in `app/services/rules.py` calls a model.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.rag.assistant import Assistant
from app.rag.ollama_client import OllamaError

router = APIRouter()


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


def _assistant(request: Request) -> Assistant:
    assistant: Assistant | None = getattr(request.app.state, "assistant", None)
    if assistant is None or not assistant.settings.assistant_enabled:
        raise HTTPException(503, "the All4Knox assistant is disabled")
    return assistant


@router.get("/assistant/status", tags=["assistant"])
async def assistant_status(request: Request) -> dict[str, Any]:
    assistant: Assistant | None = getattr(request.app.state, "assistant", None)
    if assistant is None:
        return {"enabled": False, "reason": "assistant not initialised"}
    return await assistant.status()


@router.post("/assistant/reindex", tags=["assistant"])
async def reindex(request: Request) -> dict[str, Any]:
    """Force a rebuild of the vector index from the approved content."""
    assistant = _assistant(request)
    try:
        return await assistant.ensure_index(force=True)
    except OllamaError as exc:
        raise HTTPException(502, f"could not reach Ollama: {exc}") from exc


@router.post("/assistant/ask", tags=["assistant"])
async def ask(request: Request, payload: AskRequest) -> dict[str, Any]:
    assistant = _assistant(request)
    if not assistant.store.ready:
        try:
            await assistant.ensure_index()
        except OllamaError as exc:
            raise HTTPException(502, f"could not build the index: {exc}") from exc
    try:
        return await assistant.ask(payload.question)
    except (OllamaError, ValueError) as exc:
        raise HTTPException(502, str(exc)) from exc


@router.post("/assistant/ask/stream", tags=["assistant"])
async def ask_stream(request: Request, payload: AskRequest) -> StreamingResponse:
    """Server-sent events: citations first, then answer tokens."""
    assistant = _assistant(request)
    if not assistant.store.ready:
        try:
            await assistant.ensure_index()
        except OllamaError as exc:
            raise HTTPException(502, f"could not build the index: {exc}") from exc

    async def event_stream():
        async for event in assistant.ask_stream(payload.question):
            yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # nginx buffers SSE by default, which makes streaming look frozen.
            "X-Accel-Buffering": "no",
        },
    )
