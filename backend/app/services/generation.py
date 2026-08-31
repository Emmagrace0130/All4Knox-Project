"""
Generation settings and system prompts.

Both follow the same shape: a system-wide default that everyone gets, and
optional per-user overrides for those allowed to have them.

Bounds are enforced server-side. A clinician tuning temperature is a legitimate
workflow; a clinician setting temperature to 5 and getting incoherent output in
front of a patient is not, so the range is clamped rather than trusted.
"""

from __future__ import annotations

import uuid
from typing import Any

from app.core import db
from app.services.auth import SYSTEM_SETTINGS_ID, now

# (minimum, maximum, default). Defaults are deliberately conservative: this is
# clinical decision support, not creative writing.
BOUNDS: dict[str, tuple[float, float, float]] = {
    "temperature": (0.0, 1.5, 0.1),
    "top_p": (0.05, 1.0, 0.9),
    "top_k": (1, 200, 40),
    "max_tokens": (64, 8192, 1024),
    "repeat_penalty": (0.5, 2.0, 1.1),
}

FIELDS = tuple(BOUNDS)


def clamp(field: str, value: Any) -> float | int | None:
    if value is None:
        return None
    low, high, _ = BOUNDS[field]
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    number = max(low, min(high, number))
    return int(number) if field in ("top_k", "max_tokens") else number


def defaults() -> dict[str, Any]:
    return {field: BOUNDS[field][2] for field in FIELDS}


def _row_to_settings(row: Any) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for field in FIELDS:
        if row[field] is not None:
            out[field] = row[field]
    if row["model"]:
        out["model"] = row["model"]
    return out


def get_settings(user_id: str | None) -> dict[str, Any]:
    """System defaults, overlaid with this user's overrides where present."""
    resolved = defaults()

    system = db.query_one(
        "SELECT * FROM generation_settings WHERE user_id = ?", (SYSTEM_SETTINGS_ID,)
    )
    if system:
        resolved.update(_row_to_settings(system))

    if user_id:
        personal = db.query_one(
            "SELECT * FROM generation_settings WHERE user_id = ?", (user_id,)
        )
        if personal:
            resolved.update(_row_to_settings(personal))

    return resolved


def save_settings(user_id: str, values: dict[str, Any]) -> dict[str, Any]:
    """Upsert, clamping every field. Unknown keys are ignored."""
    clean = {field: clamp(field, values.get(field)) for field in FIELDS}
    model = values.get("model") or None

    db.execute(
        "INSERT INTO generation_settings "
        "(user_id, temperature, top_p, top_k, max_tokens, repeat_penalty, model, updated_at) "
        "VALUES (?,?,?,?,?,?,?,?) "
        "ON CONFLICT(user_id) DO UPDATE SET "
        "temperature=excluded.temperature, top_p=excluded.top_p, top_k=excluded.top_k, "
        "max_tokens=excluded.max_tokens, repeat_penalty=excluded.repeat_penalty, "
        "model=excluded.model, updated_at=excluded.updated_at",
        (
            user_id,
            clean["temperature"],
            clean["top_p"],
            clean["top_k"],
            clean["max_tokens"],
            clean["repeat_penalty"],
            model,
            now(),
        ),
    )
    return get_settings(None if user_id == SYSTEM_SETTINGS_ID else user_id)


def reset_settings(user_id: str) -> dict[str, Any]:
    db.execute("DELETE FROM generation_settings WHERE user_id = ?", (user_id,))
    return get_settings(user_id)


def to_ollama_options(settings: dict[str, Any]) -> dict[str, Any]:
    """Map our field names onto Ollama's `options` block."""
    return {
        "temperature": settings.get("temperature"),
        "top_p": settings.get("top_p"),
        "top_k": settings.get("top_k"),
        "num_predict": settings.get("max_tokens"),
        "repeat_penalty": settings.get("repeat_penalty"),
    }


# --------------------------------------------------------------------------
# System prompts
# --------------------------------------------------------------------------
def create_prompt(
    name: str, body: str, author_id: str, notes: str | None = None
) -> dict[str, Any]:
    prompt_id = uuid.uuid4().hex
    stamp = now()
    db.execute(
        "INSERT INTO system_prompts (id, name, body, author_id, status, notes, created_at, updated_at) "
        "VALUES (?,?,?,?,'draft',?,?,?)",
        (prompt_id, name.strip(), body, author_id, notes, stamp, stamp),
    )
    return get_prompt(prompt_id)  # type: ignore[return-value]


def update_prompt(
    prompt_id: str, name: str | None = None, body: str | None = None, notes: str | None = None
) -> dict[str, Any] | None:
    existing = db.query_one("SELECT * FROM system_prompts WHERE id = ?", (prompt_id,))
    if existing is None:
        return None
    db.execute(
        "UPDATE system_prompts SET name = ?, body = ?, notes = ?, updated_at = ? WHERE id = ?",
        (
            (name or existing["name"]).strip(),
            body if body is not None else existing["body"],
            notes if notes is not None else existing["notes"],
            now(),
            prompt_id,
        ),
    )
    return get_prompt(prompt_id)


def get_prompt(prompt_id: str) -> dict[str, Any] | None:
    row = db.query_one("SELECT * FROM system_prompts WHERE id = ?", (prompt_id,))
    return _prompt_dict(row) if row else None


def _prompt_dict(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "body": row["body"],
        "authorId": row["author_id"],
        "status": row["status"],
        "notes": row["notes"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def list_prompts(author_id: str | None = None, include_drafts: bool = False) -> list[dict[str, Any]]:
    """
    Published and default prompts are visible to anyone allowed to choose one.
    Drafts are private to their author — the point of a draft is to test a
    prompt without inflicting it on anyone else.
    """
    if include_drafts and author_id:
        rows = db.query(
            "SELECT * FROM system_prompts WHERE status IN ('published','default') "
            "OR (status = 'draft' AND author_id = ?) ORDER BY updated_at DESC",
            (author_id,),
        )
    else:
        rows = db.query(
            "SELECT * FROM system_prompts WHERE status IN ('published','default') "
            "ORDER BY updated_at DESC"
        )
    return [_prompt_dict(r) for r in rows]


def set_status(prompt_id: str, status: str) -> dict[str, Any] | None:
    if status not in ("draft", "published", "default"):
        raise ValueError(f"invalid prompt status {status!r}")
    if status == "default":
        # Exactly one default. Demote the incumbent to published rather than
        # deleting it, so it stays selectable and the change is reversible.
        db.execute(
            "UPDATE system_prompts SET status = 'published' WHERE status = 'default'"
        )
    db.execute(
        "UPDATE system_prompts SET status = ?, updated_at = ? WHERE id = ?",
        (status, now(), prompt_id),
    )
    return get_prompt(prompt_id)


def delete_prompt(prompt_id: str) -> bool:
    row = db.query_one("SELECT status FROM system_prompts WHERE id = ?", (prompt_id,))
    if row is None:
        return False
    if row["status"] == "default":
        # Deleting the active default would leave the assistant with no prompt.
        raise ValueError("cannot delete the default prompt; publish another one first")
    db.execute("DELETE FROM system_prompts WHERE id = ?", (prompt_id,))
    return True


def active_prompt_body(fallback: str) -> str:
    row = db.query_one("SELECT body FROM system_prompts WHERE status = 'default' LIMIT 1")
    return row["body"] if row else fallback
