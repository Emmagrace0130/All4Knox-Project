"""
Content endpoints.

These serve the reviewed clinical content bundles verbatim, in the exact shape
`frontend/src/content` declares, so the React pages can render API data with no
component changes (README: "adding the backend will not require UI changes").
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.services import content

router = APIRouter()


@router.get("/content/version", tags=["content"])
def get_version() -> dict[str, Any]:
    return content.load("version")


@router.get("/content/{bundle}", tags=["content"])
def get_bundle(bundle: str) -> dict[str, Any]:
    try:
        return content.load(bundle)
    except KeyError:
        raise HTTPException(
            404,
            f"unknown content bundle '{bundle}'. Available: "
            + ", ".join(content.BUNDLES),
        ) from None
