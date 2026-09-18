"""
Clinical review endpoints.

Read access is open — anyone may see what has and has not been reviewed;
that transparency is the point of skeleton §20. Writing a review requires the
clinician role (authoritative) or admin (internal QA only).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_session, require_clinician
from app.services import review

router = APIRouter()


class ReviewRequest(BaseModel):
    decision: str
    comments: str | None = Field(default=None, max_length=8000)
    effectiveDate: str | None = None
    nextReviewDate: str | None = None


class ProfileRequest(BaseModel):
    credential: str | None = Field(default=None, max_length=40)
    licenseState: str | None = Field(default=None, max_length=40)
    npi: str | None = Field(default=None, max_length=20)


@router.get("/review/queue", tags=["review"])
def queue(session: dict[str, Any] = Depends(get_session)) -> dict[str, Any]:
    """The reviewer worklist. Readable by anyone — review state is public."""
    role = session.get("role", "visitor")
    data = review.queue()
    return {
        **data,
        "role": role,
        "canReview": role in review.AUTHORITY_BY_ROLE,
        # What this caller's reviews would be recorded as.
        "authority": review.AUTHORITY_BY_ROLE.get(role),
    }


@router.get("/review/blocks/{block_id}", tags=["review"])
def block_detail(
    block_id: str, session: dict[str, Any] = Depends(get_session)
) -> dict[str, Any]:
    data = review.detail(block_id)
    if data is None:
        raise HTTPException(404, f"no reviewable block with id {block_id}")
    role = session.get("role", "visitor")
    return {
        **data,
        "canReview": role in review.AUTHORITY_BY_ROLE,
        "authority": review.AUTHORITY_BY_ROLE.get(role),
        "decisions": list(review.DECISIONS),
    }


@router.post("/review/blocks/{block_id}", tags=["review"])
def submit_review(
    block_id: str,
    payload: ReviewRequest,
    session: dict[str, Any] = Depends(require_clinician),
) -> dict[str, Any]:
    """
    Record a review.

    A clinician's is authoritative. An admin's is recorded as internal QA and
    never counts toward the reviewed total — an engineer must not be able to
    sign off on clinical guidance, even accidentally.
    """
    try:
        record = review.record(
            block_id,
            session,
            payload.decision,
            payload.comments,
            payload.effectiveDate,
            payload.nextReviewDate,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"review": record, "block": review.detail(block_id)}


@router.get("/review/history/{block_id}", tags=["review"])
def block_history(block_id: str) -> dict[str, Any]:
    return {"blockId": block_id, "history": review.history(block_id)}


@router.get("/review/profile", tags=["review"])
def get_profile(session: dict[str, Any] = Depends(require_clinician)) -> dict[str, Any]:
    return {
        "profile": review.get_profile(session["userId"]),
        "authority": review.AUTHORITY_BY_ROLE.get(session.get("role", "")),
    }


@router.put("/review/profile", tags=["review"])
def put_profile(
    payload: ProfileRequest, session: dict[str, Any] = Depends(require_clinician)
) -> dict[str, Any]:
    """
    Credentials are recorded, never required. A reviewer can start before their
    paperwork is on file; the record then shows the credential as missing
    rather than implying one exists.
    """
    return {"profile": review.save_profile(session["userId"], payload.model_dump())}
