"""Generation settings and system prompt management."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_session, require_admin, require_clinician
from app.services import generation
from app.services.auth import SYSTEM_SETTINGS_ID

router = APIRouter()


class SettingsRequest(BaseModel):
    temperature: float | None = None
    top_p: float | None = None
    top_k: int | None = None
    max_tokens: int | None = None
    repeat_penalty: float | None = None
    model: str | None = None


class PromptRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=10, max_length=20000)
    notes: str | None = Field(default=None, max_length=2000)


class PromptUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    body: str | None = Field(default=None, max_length=20000)
    notes: str | None = Field(default=None, max_length=2000)


class StatusRequest(BaseModel):
    status: str


# --------------------------------------------------------------------------
# Generation settings
# --------------------------------------------------------------------------
@router.get("/settings/generation", tags=["settings"])
def get_generation(session: dict[str, Any] = Depends(get_session)) -> dict[str, Any]:
    """
    Effective settings for this caller, plus the bounds the UI should enforce.
    Readable by anyone — a visitor can see what the assistant is running with.
    """
    return {
        "settings": generation.get_settings(session.get("userId")),
        "defaults": generation.defaults(),
        "bounds": {
            field: {"min": low, "max": high, "default": default}
            for field, (low, high, default) in generation.BOUNDS.items()
        },
        "editable": session.get("role") in ("clinician", "admin"),
    }


@router.put("/settings/generation", tags=["settings"])
def put_generation(
    payload: SettingsRequest, session: dict[str, Any] = Depends(require_clinician)
) -> dict[str, Any]:
    """Save this user's personal overrides. Values are clamped server-side."""
    return {
        "settings": generation.save_settings(
            session["userId"], payload.model_dump(exclude_none=False)
        )
    }


@router.delete("/settings/generation", tags=["settings"])
def reset_generation(
    session: dict[str, Any] = Depends(require_clinician),
) -> dict[str, Any]:
    return {"settings": generation.reset_settings(session["userId"])}


@router.put("/admin/settings/generation", tags=["admin"])
def put_system_generation(
    payload: SettingsRequest, _: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    """Set the system-wide defaults that visitors and un-customised users get."""
    return {
        "settings": generation.save_settings(
            SYSTEM_SETTINGS_ID, payload.model_dump(exclude_none=False)
        )
    }


# --------------------------------------------------------------------------
# System prompts
# --------------------------------------------------------------------------
@router.get("/prompts", tags=["settings"])
def list_prompts(session: dict[str, Any] = Depends(get_session)) -> dict[str, Any]:
    is_admin = session.get("role") == "admin"
    return {
        "prompts": generation.list_prompts(
            author_id=session.get("userId"), include_drafts=is_admin
        ),
        "canEdit": is_admin,
    }


@router.post("/admin/prompts", tags=["admin"])
def create_prompt(
    payload: PromptRequest, session: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    return {
        "prompt": generation.create_prompt(
            payload.name, payload.body, session["userId"], payload.notes
        )
    }


@router.put("/admin/prompts/{prompt_id}", tags=["admin"])
def update_prompt(
    prompt_id: str, payload: PromptUpdate, _: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    prompt = generation.update_prompt(
        prompt_id, payload.name, payload.body, payload.notes
    )
    if prompt is None:
        raise HTTPException(404, f"no prompt with id {prompt_id}")
    return {"prompt": prompt}


@router.put("/admin/prompts/{prompt_id}/status", tags=["admin"])
def set_prompt_status(
    prompt_id: str, payload: StatusRequest, _: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    """
    draft → private to its author.
    published → selectable.
    default → what the assistant actually uses. Exactly one at a time; the
    previous default is demoted to published, never deleted.
    """
    try:
        prompt = generation.set_status(prompt_id, payload.status)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    if prompt is None:
        raise HTTPException(404, f"no prompt with id {prompt_id}")
    return {"prompt": prompt}


@router.delete("/admin/prompts/{prompt_id}", tags=["admin"])
def delete_prompt(
    prompt_id: str, _: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    try:
        if not generation.delete_prompt(prompt_id):
            raise HTTPException(404, f"no prompt with id {prompt_id}")
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"ok": True}
