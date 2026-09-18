"""
Clinical review guarantees.

Three properties matter more than the rest, and each has a test:

1. An admin cannot record an authoritative clinical review.
2. Editing content after sign-off invalidates the review.
3. Review records are never rewritten — corrections append.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from app.core import db
from app.services import auth, review


@pytest.fixture(autouse=True)
def temp_db():
    """A fresh database per test — review state is global by nature."""
    with tempfile.TemporaryDirectory() as tmp:
        db.configure(Path(tmp) / "test.db")
        db._local.conn = None  # force a new connection for this path
        yield


def _session(role: str, name: str = "Test User"):
    user = auth.create_user(
        f"{role}@example.com", name, "a-long-enough-password", role  # type: ignore[arg-type]
    )
    return {"id": "sess", "userId": user["id"], "role": role, "user": user}


def _first_block_id() -> str:
    return next(iter(review.blocks()))


# --- the role split --------------------------------------------------------
def test_clinician_review_is_authoritative():
    block_id = _first_block_id()
    record = review.record(block_id, _session("clinician"), "approved")
    assert record["authority"] == "clinical"
    assert review.status_for(review.blocks()[block_id])["state"] == "reviewed"


def test_admin_review_is_qa_and_never_counts():
    """
    An engineer holding admin must not be able to sign off on clinical
    guidance, even by accident. Their record is kept and shown — as QA.
    """
    block_id = _first_block_id()
    record = review.record(block_id, _session("admin"), "approved")

    assert record["authority"] == "qa"
    status = review.status_for(review.blocks()[block_id])
    assert status["state"] == "unreviewed", "an admin QA record must not mark a block reviewed"
    assert status["clinicalCount"] == 0
    assert status["qaCount"] == 1
    assert review.queue()["reviewedCount"] == 0


def test_basic_and_visitor_cannot_review():
    block_id = _first_block_id()
    for role in ("basic", "visitor"):
        session = {"id": "s", "userId": None, "role": role, "user": None}
        with pytest.raises(ValueError, match="cannot record reviews"):
            review.record(block_id, session, "approved")


# --- content hashing -------------------------------------------------------
def test_review_goes_stale_when_the_content_changes():
    """
    Skeleton §21 forbids silent rule changes. Editing a block after sign-off
    must not carry the old attestation onto the new text.
    """
    block_id = _first_block_id()
    review.record(block_id, _session("clinician"), "approved")

    block = review.blocks()[block_id]
    assert review.status_for(block)["state"] == "reviewed"

    # Simulate the text changing underneath the approval.
    edited = {**block, "contentHash": review.hash_text(block["text"] + " ...amended")}
    status = review.status_for(edited)

    assert status["state"] == "stale"
    assert status["contentChangedSinceReview"] is True
    assert status["latestClinical"] is not None, "the old review is retained, not deleted"


def test_hash_is_stable_and_content_specific():
    assert review.hash_text("abc") == review.hash_text("abc")
    assert review.hash_text("abc") != review.hash_text("abc ")


# --- append-only audit trail ----------------------------------------------
def test_corrections_append_rather_than_overwrite():
    block_id = _first_block_id()
    session = _session("clinician")

    review.record(block_id, session, "needs_info", comments="dose limit unclear")
    review.record(block_id, session, "approved", comments="clarified against slide 6")

    trail = review.history(block_id)
    assert len(trail) == 2, "both records must survive"
    assert trail[0]["decision"] == "approved", "newest first"
    assert trail[1]["decision"] == "needs_info"
    assert review.status_for(review.blocks()[block_id])["state"] == "reviewed"


def test_rejection_is_reported_not_swallowed():
    block_id = _first_block_id()
    review.record(block_id, _session("clinician"), "rejected", comments="contradicts slide 4")
    assert review.status_for(review.blocks()[block_id])["state"] == "rejected"


# --- credentials are recorded, not required -------------------------------
def test_review_works_without_a_credential_on_file():
    """A pilot reviewer must be able to start before paperwork is complete."""
    block_id = _first_block_id()
    record = review.record(block_id, _session("clinician"), "approved")
    assert record["credential"] is None, "missing credential is recorded as missing"
    assert record["reviewerName"] == "Test User"


def test_credential_is_snapshotted_onto_the_record():
    block_id = _first_block_id()
    session = _session("clinician", "Dr Jane Smith")
    review.save_profile(session["userId"], {"credential": "MD", "licenseState": "TN"})

    record = review.record(block_id, session, "approved")
    assert record["credential"] == "MD"
    assert record["licenseState"] == "TN"
    assert record["reviewerName"] == "Dr Jane Smith"


# --- the queue -------------------------------------------------------------
def test_queue_covers_every_registry_block_and_starts_unreviewed():
    data = review.queue()
    # 29 blocks transcribed from the Clinical Summary, plus one from content
    # version 2026.2 splitting the non-BESMART TennCare pathway by prescriber.
    assert data["total"] == 30, f"expected 30 reviewable blocks, got {data['total']}"
    assert data["counts"]["unreviewed"] == 30
    assert data["reviewedCount"] == 0


def test_queue_puts_the_work_first():
    block_id = _first_block_id()
    review.record(block_id, _session("clinician"), "approved")
    states = [b["state"] for b in review.queue()["blocks"]]
    assert states[0] == "unreviewed", "unreviewed blocks sort ahead of reviewed ones"
    assert states[-1] == "reviewed"


def test_unknown_block_is_rejected():
    with pytest.raises(ValueError, match="no reviewable block"):
        review.record("not_a_block", _session("clinician"), "approved")


def test_unknown_decision_is_rejected():
    with pytest.raises(ValueError, match="unknown decision"):
        review.record(_first_block_id(), _session("clinician"), "looks_fine_to_me")
