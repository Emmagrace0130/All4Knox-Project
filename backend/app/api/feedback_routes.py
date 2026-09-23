"""
Site feedback endpoints.

Submitting is open to everyone, visitors included. Reading responses is
admin-only; the usual way to read them is `./a4k feedback`, which exports them
to Markdown files under feedback/inbox/.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.deps import get_session, require_admin
from app.services import content, feedback

router = APIRouter()


class FeedbackRequest(BaseModel):
    ratings: dict[str, Any] = Field(default_factory=dict)
    answers: dict[str, Any] = Field(default_factory=dict)
    page: str | None = Field(default=None, max_length=300)
    contactEmail: str | None = Field(default=None, max_length=200)
    viewport: str | None = Field(default=None, max_length=40)


@router.get("/feedback/questions", tags=["feedback"])
def questions() -> dict[str, Any]:
    return feedback.questions()


@router.post("/feedback", tags=["feedback"])
def submit(
    payload: FeedbackRequest,
    request: Request,
    session: dict[str, Any] = Depends(get_session),
) -> dict[str, Any]:
    try:
        record = feedback.submit(
            session,
            payload.ratings,
            payload.answers,
            payload.page,
            content.content_version(),
            payload.contactEmail,
            request.headers.get("user-agent"),
            payload.viewport,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"id": record["id"], "createdAt": record["createdAt"]}


@router.get("/admin/feedback", tags=["feedback"])
def list_feedback(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    items = feedback.list_all()
    return {"count": len(items), "feedback": items}
