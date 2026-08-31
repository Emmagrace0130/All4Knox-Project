"""
Assistant conversation persistence.

The requirement: a provider switches away from Ask All4Knox and comes back, and
their conversation is still there. That means conversations are keyed by
SESSION, not by account — a visitor gets continuity too, and loses it when
their session is swept.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from app.core import db
from app.services.auth import now

# How many prior turns to replay to the model. Keeps latency and context
# predictable; the full transcript is still stored and shown in the UI.
HISTORY_TURNS = 6


def _new_id() -> str:
    return uuid.uuid4().hex


def create(session_id: str, user_id: str | None, title: str | None = None) -> str:
    conversation_id = _new_id()
    stamp = now()
    db.execute(
        "INSERT INTO conversations (id, session_id, user_id, title, created_at, updated_at) "
        "VALUES (?,?,?,?,?,?)",
        (conversation_id, session_id, user_id, title, stamp, stamp),
    )
    return conversation_id


def current(session_id: str, user_id: str | None) -> str:
    """The session's active conversation, created on first use."""
    row = db.query_one(
        "SELECT id FROM conversations WHERE session_id = ? ORDER BY updated_at DESC LIMIT 1",
        (session_id,),
    )
    return row["id"] if row else create(session_id, user_id)


def belongs_to_session(conversation_id: str, session_id: str) -> bool:
    row = db.query_one(
        "SELECT 1 FROM conversations WHERE id = ? AND session_id = ?",
        (conversation_id, session_id),
    )
    return row is not None


def add_message(
    conversation_id: str,
    role: str,
    content: str,
    citations: list[dict[str, Any]] | None = None,
    refused: bool = False,
) -> str:
    message_id = _new_id()
    db.execute(
        "INSERT INTO messages (id, conversation_id, role, content, citations, refused, created_at) "
        "VALUES (?,?,?,?,?,?,?)",
        (
            message_id,
            conversation_id,
            role,
            content,
            json.dumps(citations) if citations else None,
            1 if refused else 0,
            now(),
        ),
    )
    db.execute(
        "UPDATE conversations SET updated_at = ? WHERE id = ?", (now(), conversation_id)
    )
    # First user message becomes the conversation's title.
    if role == "user":
        row = db.query_one(
            "SELECT title FROM conversations WHERE id = ?", (conversation_id,)
        )
        if row is not None and not row["title"]:
            title = content.strip().replace("\n", " ")
            db.execute(
                "UPDATE conversations SET title = ? WHERE id = ?",
                (title[:80] + ("…" if len(title) > 80 else ""), conversation_id),
            )
    return message_id


def messages(conversation_id: str) -> list[dict[str, Any]]:
    rows = db.query(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid",
        (conversation_id,),
    )
    return [
        {
            "id": r["id"],
            "role": r["role"],
            "content": r["content"],
            "citations": json.loads(r["citations"]) if r["citations"] else [],
            "refused": bool(r["refused"]),
            "createdAt": r["created_at"],
        }
        for r in rows
    ]


def history_for_model(conversation_id: str) -> list[dict[str, str]]:
    """
    Recent turns as chat messages.

    Citations are deliberately dropped here: replaying them would let a source
    cited in an earlier answer act as context for a later one, bypassing the
    retrieval floor. Every turn must stand on its own retrieval.
    """
    recent = messages(conversation_id)[-(HISTORY_TURNS * 2) :]
    return [{"role": m["role"], "content": m["content"]} for m in recent]


def list_for_session(session_id: str) -> list[dict[str, Any]]:
    rows = db.query(
        "SELECT c.*, (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS n "
        "FROM conversations c WHERE c.session_id = ? ORDER BY c.updated_at DESC",
        (session_id,),
    )
    return [
        {
            "id": r["id"],
            "title": r["title"] or "New conversation",
            "messageCount": r["n"],
            "createdAt": r["created_at"],
            "updatedAt": r["updated_at"],
        }
        for r in rows
    ]


def delete(conversation_id: str, session_id: str) -> bool:
    if not belongs_to_session(conversation_id, session_id):
        return False
    db.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    return True


def clear_session(session_id: str) -> None:
    db.execute("DELETE FROM conversations WHERE session_id = ?", (session_id,))
