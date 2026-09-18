"""
Deterministic clinical rule evaluation.

These are line-for-line ports of the TypeScript engines in
`frontend/src/services/`. They must stay behaviourally identical: the frontend
falls back to its local copy when the API is unreachable, so a divergence would
mean a clinician sees different guidance depending on network conditions.
`tests/test_parity.py` locks the two implementations together.

No model is involved anywhere in this file (skeleton §23: the decision trees
are rule-based, deterministic, testable and reviewable).
"""

from __future__ import annotations

from typing import Any

from app.models.clinical import (
    ALL_ANALYTES,
    OTHER_OPIOID_KEYS,
    STIMULANT_KEYS,
)
from app.services import content

# --------------------------------------------------------------------------
# UDS  — port of frontend/src/services/udsRules.ts
# --------------------------------------------------------------------------


def _matches_panel(match: dict[str, Any], panel: dict[str, bool]) -> bool:
    if "bup" in match and panel["bup"] != match["bup"]:
        return False
    if "fent" in match and panel["fent"] != match["fent"]:
        return False

    if "anyStimulant" in match:
        stim = any(panel[k] for k in STIMULANT_KEYS)
        if stim != match["anyStimulant"]:
            return False

    if "anyOtherOpioid" in match:
        other = any(panel[k] for k in OTHER_OPIOID_KEYS)
        if other != match["anyOtherOpioid"]:
            return False

    # Slide 7's "*FENT or other opioid" footnote: fentanyl OR opiates/oxy/mtd.
    if "anyOpioid" in match:
        opioid = panel["fent"] or any(panel[k] for k in OTHER_OPIOID_KEYS)
        if opioid != match["anyOpioid"]:
            return False

    if "allOthersNegative" in match:
        others_negative = all(not panel[k] for k in ALL_ANALYTES if k != "bup")
        if others_negative != match["allOthersNegative"]:
            return False

    return True


def positive_keys(panel: dict[str, bool]) -> list[str]:
    return [k for k in ALL_ANALYTES if panel[k]]


def interpret_uds(panel: dict[str, bool]) -> dict[str, Any]:
    """
    Every applicable rule, most relevant first, plus any positive finding no
    matched rule speaks to. A combination with no matching rule returns
    `primary: None` so the UI can say the combination is not documented rather
    than invent guidance.
    """
    rules: list[dict[str, Any]] = content.load("uds")["rules"]

    matched = sorted(
        (r for r in rules if _matches_panel(r.get("match", {}), panel)),
        key=lambda r: r.get("priority", 0),
        reverse=True,
    )

    superseded: set[str] = set()
    for rule in matched:
        superseded.update(rule.get("supersedes", []) or [])
    active = [r for r in matched if r["id"] not in superseded]

    addressed: set[str] = set()
    for rule in active:
        addressed.update(rule.get("addresses", []) or [])
    unaddressed = [k for k in positive_keys(panel) if k not in addressed]

    return {
        "primary": active[0] if active else None,
        "additional": active[1:],
        "unaddressed": unaddressed,
    }


# --------------------------------------------------------------------------
# Prescribing  — port of frontend/src/services/prescribingRules.ts
# --------------------------------------------------------------------------


def _matches_input(match: dict[str, Any], data: dict[str, Any]) -> bool:
    for field in ("coverage", "prescriber", "besmart"):
        if field in match and match[field] != data.get(field):
            return False
    return True


def _specificity(match: dict[str, Any]) -> int:
    return len([v for v in match.values() if v is not None])


def needs_besmart(data: dict[str, Any]) -> bool:
    """BESMART status is only asked when the patient has TennCare (§6)."""
    return data.get("coverage") == "tenncare"


def is_prescribing_complete(data: dict[str, Any]) -> bool:
    if not data.get("coverage") or not data.get("prescriber"):
        return False
    if needs_besmart(data) and not data.get("besmart"):
        return False
    return True


def evaluate_prescribing(data: dict[str, Any]) -> dict[str, Any] | None:
    """Most specific matching pathway, or None when none applies."""
    pathways: list[dict[str, Any]] = content.load("prescribing")["pathways"]
    matched = sorted(
        (p for p in pathways if _matches_input(p.get("match", {}), data)),
        key=lambda p: _specificity(p.get("match", {})),
        reverse=True,
    )
    return matched[0] if matched else None


# --------------------------------------------------------------------------
# Induction  — port of frontend/src/services/inductionRules.ts
# --------------------------------------------------------------------------


def find_induction_pathway(situation: str | None) -> dict[str, Any] | None:
    if not situation:
        return None
    pathways: list[dict[str, Any]] = content.load("induction")["pathways"]
    return next((p for p in pathways if p["situation"] == situation), None)


def select_induction_outcome(
    pathway: dict[str, Any] | None, answers: dict[str, str]
) -> dict[str, Any] | None:
    """
    The outcome whose `when` clause matches the most answers wins. An outcome
    with no `when` is the pathway's default result.
    """
    if not pathway:
        return None

    best: dict[str, Any] | None = None
    best_score = -1
    for outcome in pathway.get("outcomes", []):
        when = outcome.get("when") or {}
        if any(answers.get(k) != v for k, v in when.items()):
            continue
        score = len(when)
        if score > best_score:
            best, best_score = outcome, score
    return best


def pending_follow_ups(
    pathway: dict[str, Any] | None, answers: dict[str, str]
) -> list[dict[str, Any]]:
    if not pathway:
        return []
    return [f for f in pathway.get("followUps", []) if f["id"] not in answers]


# --------------------------------------------------------------------------
# Dosing
# --------------------------------------------------------------------------


def review_dosing(cravings: bool | None) -> dict[str, Any] | None:
    bundle = content.load("dosing")
    if cravings is None:
        return None
    return bundle["cravingsYes"] if cravings else bundle["cravingsNo"]
