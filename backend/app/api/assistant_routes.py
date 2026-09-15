"""
"Ask All4Knox" assistant endpoints.

Every route degrades safely: when the assistant is disabled or Ollama is
unreachable the deterministic clinical tools are entirely unaffected, because
nothing in `app/services/rules.py` calls a model.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.deps import get_session
from app.services import conversations

from app.rag.assistant import Assistant
from app.rag.ollama_client import OllamaError

router = APIRouter()


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    # Omit to continue this session's active conversation.
    conversationId: str | None = None


def _conversation_for(
    session: dict[str, Any], requested: str | None
) -> str:
    """
    Resolve the conversation to append to, refusing one that belongs to a
    different session. Without that check a guessed id would expose someone
    else's transcript.
    """
    if requested:
        if not conversations.belongs_to_session(requested, session["id"]):
            raise HTTPException(404, "no such conversation in this session")
        return requested
    return conversations.current(session["id"], session.get("userId"))


def _assistant(request: Request) -> Assistant:
    assistant: Assistant | None = getattr(request.app.state, "assistant", None)
    if assistant is None or not assistant.settings.assistant_enabled:
        raise HTTPException(503, "the All4Knox assistant is disabled")
    return assistant


@router.get("/assistant/status", tags=["assistant"])
async def assistant_status(
    request: Request, session: dict[str, Any] = Depends(get_session)
) -> dict[str, Any]:
    assistant: Assistant | None = getattr(request.app.state, "assistant", None)
    if assistant is None:
        return {"enabled": False, "reason": "assistant not initialised"}
    return await assistant.status(session.get("userId"))


# --------------------------------------------------------------------------
# Conversations
# --------------------------------------------------------------------------
@router.get("/assistant/conversations", tags=["assistant"])
def list_conversations(session: dict[str, Any] = Depends(get_session)) -> dict[str, Any]:
    return {
        "conversations": conversations.list_for_session(session["id"]),
        "role": session.get("role", "visitor"),
    }


@router.get("/assistant/conversations/current", tags=["assistant"])
def current_conversation(
    session: dict[str, Any] = Depends(get_session),
) -> dict[str, Any]:
    """
    The session's active conversation and its full transcript.

    This is what makes tab-switching work: the page asks for this on mount and
    rehydrates whatever was already said.
    """
    conversation_id = conversations.current(session["id"], session.get("userId"))
    return {
        "conversationId": conversation_id,
        "messages": conversations.messages(conversation_id),
        "role": session.get("role", "visitor"),
    }


@router.get("/assistant/conversations/{conversation_id}", tags=["assistant"])
def get_conversation(
    conversation_id: str, session: dict[str, Any] = Depends(get_session)
) -> dict[str, Any]:
    if not conversations.belongs_to_session(conversation_id, session["id"]):
        raise HTTPException(404, "no such conversation in this session")
    return {
        "conversationId": conversation_id,
        "messages": conversations.messages(conversation_id),
    }


@router.post("/assistant/conversations", tags=["assistant"])
def new_conversation(session: dict[str, Any] = Depends(get_session)) -> dict[str, Any]:
    conversation_id = conversations.create(session["id"], session.get("userId"))
    return {"conversationId": conversation_id, "messages": []}


@router.delete("/assistant/conversations/{conversation_id}", tags=["assistant"])
def delete_conversation(
    conversation_id: str, session: dict[str, Any] = Depends(get_session)
) -> dict[str, Any]:
    if not conversations.delete(conversation_id, session["id"]):
        raise HTTPException(404, "no such conversation in this session")
    return {"ok": True}


@router.post("/assistant/reindex", tags=["assistant"])
async def reindex(request: Request) -> dict[str, Any]:
    """Force a rebuild of every collection index: toolkit content and reference documents."""
    assistant = _assistant(request)
    try:
        return await assistant.ensure_index(force=True)
    except OllamaError as exc:
        raise HTTPException(502, f"could not reach Ollama: {exc}") from exc


@router.post("/assistant/ask", tags=["assistant"])
async def ask(
    request: Request,
    payload: AskRequest,
    session: dict[str, Any] = Depends(get_session),
) -> dict[str, Any]:
    assistant = _assistant(request)
    if not assistant.ready:
        try:
            await assistant.ensure_index()
        except OllamaError as exc:
            raise HTTPException(502, f"could not build the index: {exc}") from exc
    conversation_id = _conversation_for(session, payload.conversationId)
    try:
        return await assistant.ask(
            payload.question, conversation_id, session.get("userId")
        )
    except (OllamaError, ValueError) as exc:
        raise HTTPException(502, str(exc)) from exc


@router.post("/assistant/ask/stream", tags=["assistant"])
async def ask_stream(
    request: Request,
    payload: AskRequest,
    session: dict[str, Any] = Depends(get_session),
) -> StreamingResponse:
    """Server-sent events: citations first, then answer tokens."""
    assistant = _assistant(request)
    if not assistant.ready:
        try:
            await assistant.ensure_index()
        except OllamaError as exc:
            raise HTTPException(502, f"could not build the index: {exc}") from exc

    conversation_id = _conversation_for(session, payload.conversationId)
    user_id = session.get("userId")

    async def event_stream():
        async for event in assistant.ask_stream(
            payload.question, conversation_id, user_id
        ):
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
