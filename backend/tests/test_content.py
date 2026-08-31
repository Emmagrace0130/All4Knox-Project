"""The content export must be present and well-formed before anything else."""

from app.services import content


def test_every_bundle_loads():
    assert set(content.verify_all()) == set(content.BUNDLES)


def test_version_is_reported():
    assert content.content_version() == "2026.1"
    assert content.source_document() == "All4Knox Clinical Summary 2026"


def test_registry_covers_every_module():
    entries = content.load("registry")["entries"]
    modules = {e["module"] for e in entries}
    assert {
        "Tennessee prescribing",
        "Induction",
        "UDS interpretation",
        "Maintenance dosing",
        "Referral directory",
    } <= modules


def test_no_content_claims_review_it_has_not_had():
    """
    Nothing has been clinically reviewed yet. A block claiming a reviewer or a
    review date would be a fabricated clinical attestation — the single most
    serious defect this codebase could carry.
    """
    for entry in content.load("registry")["entries"]:
        review = entry["review"]
        if review.get("reviewedBy") is not None:
            assert review.get("reviewedDate") is not None, (
                f"{entry['id']} names a reviewer but no review date"
            )


def test_referral_contacts_are_not_invented():
    """Skeleton + README: contact details are unverified and must stay null."""
    for org in content.load("referrals")["organizations"]:
        if org.get("phone") is not None:
            assert org.get("lastVerified") is not None, (
                f"{org['id']} has a phone number but no verification date"
            )
