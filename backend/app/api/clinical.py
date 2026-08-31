"""Deterministic clinical endpoints (skeleton §17). No model in the loop."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.models.clinical import (
    DosingInput,
    DosingResult,
    InductionInput,
    InductionResult,
    PrescribingInput,
    PrescribingResult,
    UDSPanel,
    UDSResult,
)
from app.services import content, rules

router = APIRouter()


def _meta() -> dict[str, str]:
    return {
        "contentVersion": content.content_version(),
        "sourceDocument": content.source_document(),
    }


@router.post("/uds/interpret", response_model=UDSResult, tags=["clinical"])
def interpret_uds(panel: UDSPanel) -> UDSResult:
    result = rules.interpret_uds(panel.model_dump())
    return UDSResult(panel=panel, **result, **_meta())


@router.post("/prescribing/evaluate", response_model=PrescribingResult, tags=["clinical"])
def evaluate_prescribing(payload: PrescribingInput) -> PrescribingResult:
    data = payload.model_dump()
    return PrescribingResult(
        input=payload,
        pathway=rules.evaluate_prescribing(data),
        complete=rules.is_prescribing_complete(data),
        needsBesmart=rules.needs_besmart(data),
        **_meta(),
    )


@router.post("/induction/evaluate", response_model=InductionResult, tags=["clinical"])
def evaluate_induction(payload: InductionInput) -> InductionResult:
    pathway = rules.find_induction_pathway(payload.situation)
    if payload.situation and pathway is None:
        raise HTTPException(404, f"unknown induction situation: {payload.situation}")

    pending = rules.pending_follow_ups(pathway, payload.answers)
    return InductionResult(
        input=payload,
        pathway=pathway,
        outcome=rules.select_induction_outcome(pathway, payload.answers),
        pendingFollowUps=pending,
        complete=pathway is not None and not pending,
        **_meta(),
    )


@router.post("/dosing/review", response_model=DosingResult, tags=["clinical"])
def review_dosing(payload: DosingInput) -> DosingResult:
    bundle = content.load("dosing")
    return DosingResult(
        input=payload,
        overview=bundle["overview"],
        limits=bundle["limits"],
        guidance=rules.review_dosing(payload.cravings),
        **_meta(),
    )


# --------------------------------------------------------------------------
# Directory + reference data
# --------------------------------------------------------------------------
@router.get("/referrals", tags=["clinical"])
def list_referrals(
    region: str | None = None,
    coverage: str | None = None,
    need: list[str] | None = Query(default=None),
) -> dict[str, Any]:
    """
    Filtered referral directory — a port of
    frontend/src/services/referralSearch.ts.

    The important behaviour: an unverified field NEVER excludes an
    organisation, it only marks the match `uncertain`. Filtering an org out
    because its payer status is unknown would read to a clinician as "does not
    accept this coverage", which the directory does not actually know.
    """
    bundle = content.load("referrals")
    orgs: list[dict[str, Any]] = bundle["organizations"]
    needs = need or []
    matches: list[dict[str, Any]] = []

    for org in orgs:
        unverified: list[str] = []

        # Region is recorded for every entry, so this filter is strict.
        if region and region not in org.get("region", []):
            continue

        if coverage:
            field = {
                "tenncare": org.get("acceptsTenncare"),
                "private": org.get("acceptsPrivate"),
                "uninsured": org.get("grantFunded"),
            }.get(coverage)
            if field is False:
                continue
            if field is None:
                unverified.append("patient coverage")

        excluded = False
        for wanted in needs:
            services = org.get("services") or []
            if not services:
                if "services" not in unverified:
                    unverified.append("services")
                continue
            if wanted not in services:
                excluded = True
                break
        if excluded:
            continue

        matches.append(
            {
                "organization": org,
                "uncertain": bool(unverified),
                "unverifiedAgainst": unverified,
            }
        )

    return {
        "matches": matches,
        "organizations": [m["organization"] for m in matches],
        "total": len(orgs),
        "matched": len(matches),
        "regionOptions": bundle["regionOptions"],
        "needOptions": bundle["needOptions"],
        "notExhaustiveNotice": bundle["notExhaustiveNotice"],
        **_meta(),
    }


@router.get("/referrals/{org_id}", tags=["clinical"])
def get_referral(org_id: str) -> dict[str, Any]:
    orgs = content.load("referrals")["organizations"]
    org = next((o for o in orgs if o["id"] == org_id), None)
    if org is None:
        raise HTTPException(404, f"no referral organisation with id {org_id}")
    return {"organization": org, **_meta()}


@router.get("/resources", tags=["clinical"])
def get_resources() -> dict[str, Any]:
    return {**content.load("resources"), **_meta()}


@router.get("/sources", tags=["clinical"])
def get_sources() -> dict[str, Any]:
    """
    The clinical source / version register (skeleton §20). Reports the real
    review state of every block — unreviewed content reports itself unreviewed.
    """
    entries = content.load("registry")["entries"]
    counts = {"documented": 0, "partial": 0, "pending": 0}
    for entry in entries:
        counts[entry["entryStatus"]] = counts.get(entry["entryStatus"], 0) + 1
    reviewed = len([e for e in entries if e["review"]["reviewedDate"]])
    return {
        "entries": entries,
        "counts": counts,
        "total": len(entries),
        "reviewedCount": reviewed,
        "review": content.load("version")["review"],
        **_meta(),
    }
