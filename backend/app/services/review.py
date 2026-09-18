"""
Clinical review of content blocks.

THE ROLE SPLIT
--------------
Admin is a *system* role: it says you can configure software. Clinician is a
*professional attestation*: it says a licensed person put their name behind
clinical guidance. The engineers on this project hold admin. They must not be
able to record a clinical sign-off, and that is enforced here rather than left
to everyone remembering:

* `clinician` → `authority='clinical'`. Authoritative. This is what
  `/clinical-sources` and `GET /api/sources` report.
* `admin`     → `authority='qa'`. Internal validation of the workflow itself.
  Stored, shown, labelled — and **never** counted as a clinical review.

WHY THE CONTENT IS HASHED
-------------------------
A review binds to a block *and to the exact text that was reviewed*. Edit the
content afterwards and the hash stops matching, so the block returns to
"needs re-review" rather than silently carrying the old attestation onto new
text. That is what actually enforces skeleton §21's "no silent rule changes".

FLEXIBILITY
-----------
This is a pilot and the process will change. Accordingly: credentials are
recorded but never *required* (a missing one is reported as missing, not
blocked on); decisions are stored as free TEXT against a validated set so
adding one is a one-line change; and both tables carry an `extra` JSON column
so fields can be added without a migration. Reviews are append-only, so
changing our minds never destroys what was already attested.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any

from app.core import db
from app.rag.corpus import build_chunks
from app.services import content
from app.services.auth import now

# Extend freely — the column is TEXT, this is just the validated set.
DECISIONS = ("approved", "approved_with_changes", "rejected", "needs_info")

AUTHORITY_BY_ROLE = {"clinician": "clinical", "admin": "qa"}


def _new_id() -> str:
    return uuid.uuid4().hex


def hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# --------------------------------------------------------------------------
# Blocks under review
# --------------------------------------------------------------------------
def blocks() -> dict[str, dict[str, Any]]:
    """
    Every reviewable block, keyed by id, with the exact text a reviewer sees.

    The text comes from `corpus.build_chunks()` — the same flattening the
    assistant retrieves over — so a reviewer signs off on precisely what the
    system will serve, not a separate rendering of it.
    """
    registry = {e["id"]: e for e in content.load("registry")["entries"]}
    out: dict[str, dict[str, Any]] = {}
    for chunk in build_chunks():
        entry = registry.get(chunk.id)
        if entry is None:
            # Governance chunks are not registry-tracked clinical blocks.
            continue
        out[chunk.id] = {
            "id": chunk.id,
            "title": entry["title"],
            "module": entry["module"],
            "route": entry["route"],
            "entryStatus": entry["entryStatus"],
            "contentVersion": entry["contentVersion"],
            "source": entry["source"],
            "text": chunk.text,
            "contentHash": hash_text(chunk.text),
        }
    return out


# --------------------------------------------------------------------------
# Recording
# --------------------------------------------------------------------------
def get_profile(user_id: str) -> dict[str, Any]:
    row = db.query_one(
        "SELECT * FROM reviewer_profiles WHERE user_id = ?", (user_id,)
    )
    if row is None:
        return {"credential": None, "licenseState": None, "npi": None, "extra": {}}
    return {
        "credential": row["credential"],
        "licenseState": row["license_state"],
        "npi": row["npi"],
        "extra": json.loads(row["extra"]) if row["extra"] else {},
        "updatedAt": row["updated_at"],
    }


def save_profile(user_id: str, values: dict[str, Any]) -> dict[str, Any]:
    db.execute(
        "INSERT INTO reviewer_profiles (user_id, credential, license_state, npi, extra, updated_at) "
        "VALUES (?,?,?,?,?,?) "
        "ON CONFLICT(user_id) DO UPDATE SET credential=excluded.credential, "
        "license_state=excluded.license_state, npi=excluded.npi, "
        "extra=excluded.extra, updated_at=excluded.updated_at",
        (
            user_id,
            (values.get("credential") or None),
            (values.get("licenseState") or None),
            (values.get("npi") or None),
            json.dumps(values.get("extra") or {}),
            now(),
        ),
    )
    return get_profile(user_id)


def record(
    block_id: str,
    session: dict[str, Any],
    decision: str,
    comments: str | None = None,
    effective_date: str | None = None,
    next_review_date: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Append a review record. Never updates an existing one.

    Raises ValueError for an unknown block, an invalid decision, or a role that
    cannot review at all.
    """
    role = session.get("role", "visitor")
    authority = AUTHORITY_BY_ROLE.get(role)
    if authority is None:
        raise ValueError(
            f"the {role} role cannot record reviews; "
            "clinical review requires the clinician role"
        )
    if decision not in DECISIONS:
        raise ValueError(f"unknown decision {decision!r}; expected one of {DECISIONS}")

    block = blocks().get(block_id)
    if block is None:
        raise ValueError(f"no reviewable block with id {block_id!r}")

    user = session.get("user") or {}
    profile = get_profile(user.get("id", "")) if user.get("id") else {}

    review_id = _new_id()
    db.execute(
        "INSERT INTO content_reviews "
        "(id, block_id, content_hash, content_version, reviewer_id, reviewer_name, "
        " credential, license_state, authority, decision, comments, effective_date, "
        " next_review_date, extra, created_at) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (
            review_id,
            block_id,
            block["contentHash"],
            block["contentVersion"],
            user.get("id"),
            user.get("displayName") or "unknown",
            profile.get("credential"),
            profile.get("licenseState"),
            authority,
            decision,
            (comments or None),
            (effective_date or None),
            (next_review_date or None),
            json.dumps(extra or {}),
            now(),
        ),
    )
    return get_review(review_id)  # type: ignore[return-value]


def _review_dict(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "blockId": row["block_id"],
        "contentHash": row["content_hash"],
        "contentVersion": row["content_version"],
        "reviewerId": row["reviewer_id"],
        "reviewerName": row["reviewer_name"],
        "credential": row["credential"],
        "licenseState": row["license_state"],
        "authority": row["authority"],
        "decision": row["decision"],
        "comments": row["comments"],
        "effectiveDate": row["effective_date"],
        "nextReviewDate": row["next_review_date"],
        "createdAt": row["created_at"],
    }


def get_review(review_id: str) -> dict[str, Any] | None:
    row = db.query_one("SELECT * FROM content_reviews WHERE id = ?", (review_id,))
    return _review_dict(row) if row else None


def history(block_id: str) -> list[dict[str, Any]]:
    """Every record for a block, newest first. Includes QA records."""
    rows = db.query(
        "SELECT * FROM content_reviews WHERE block_id = ? ORDER BY created_at DESC, rowid DESC",
        (block_id,),
    )
    return [_review_dict(r) for r in rows]


# --------------------------------------------------------------------------
# Status
# --------------------------------------------------------------------------
def status_for(block: dict[str, Any]) -> dict[str, Any]:
    """
    A block's review state.

    * `unreviewed` — no clinical review has ever been recorded
    * `stale`      — reviewed, but the content has changed since. The old
                     attestation is shown but NOT treated as current.
    * `rejected` / `needs_info` — the reviewer's decision stands
    * `reviewed`   — approved against the current content
    """
    records = history(block["id"])
    clinical = [r for r in records if r["authority"] == "clinical"]
    qa = [r for r in records if r["authority"] == "qa"]
    latest = clinical[0] if clinical else None

    if latest is None:
        state = "unreviewed"
    elif latest["contentHash"] != block["contentHash"]:
        state = "stale"
    elif latest["decision"] in ("approved", "approved_with_changes"):
        state = "reviewed"
    else:
        state = latest["decision"]

    return {
        "state": state,
        "latestClinical": latest,
        "clinicalCount": len(clinical),
        "qaCount": len(qa),
        "latestQa": qa[0] if qa else None,
        # True when a review exists but the text moved underneath it.
        "contentChangedSinceReview": bool(
            latest and latest["contentHash"] != block["contentHash"]
        ),
    }


def queue() -> dict[str, Any]:
    """Every block with its current review state, for the reviewer's worklist."""
    items = []
    counts = {
        "unreviewed": 0,
        "reviewed": 0,
        "stale": 0,
        "rejected": 0,
        "needs_info": 0,
    }
    for block in blocks().values():
        state = status_for(block)
        counts[state["state"]] = counts.get(state["state"], 0) + 1
        items.append(
            {
                "id": block["id"],
                "title": block["title"],
                "module": block["module"],
                "route": block["route"],
                "entryStatus": block["entryStatus"],
                "contentVersion": block["contentVersion"],
                "source": block["source"],
                **state,
            }
        )
    # Unreviewed and stale first — that is the actual work.
    order = {"unreviewed": 0, "stale": 1, "needs_info": 2, "rejected": 3, "reviewed": 4}
    items.sort(key=lambda i: (order.get(i["state"], 9), i["module"], i["title"]))
    return {
        "blocks": items,
        "counts": counts,
        "total": len(items),
        "reviewedCount": counts.get("reviewed", 0),
        "contentVersion": content.content_version(),
        "decisions": list(DECISIONS),
    }


def detail(block_id: str) -> dict[str, Any] | None:
    block = blocks().get(block_id)
    if block is None:
        return None
    return {**block, **status_for(block), "history": history(block_id)}
