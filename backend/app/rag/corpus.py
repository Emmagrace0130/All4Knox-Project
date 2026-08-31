"""
Builds the approved knowledge base the assistant is allowed to answer from.

Skeleton §23 is explicit: "The local model should retrieve answers only from
approved All4Knox clinical content." So the corpus is assembled from the SAME
exported content bundles the deterministic tools use — not from scraped pages
or the source PowerPoint. If a statement is not in the reviewed content, the
assistant has no way to retrieve it, and the min-score floor makes it refuse
instead of falling back on model weights.

Every chunk carries the citation fields the UI must display (skeleton §20):
source document, slide, content version, and the route of the tool that owns
the underlying rule.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.services import content


@dataclass
class Chunk:
    """One retrievable passage plus everything needed to cite it."""

    id: str
    text: str
    title: str
    module: str
    route: str
    source_document: str
    source_location: str | None = None
    slide: int | None = None
    content_version: str = ""
    entry_status: str = ""
    review_state: str = "not yet clinically reviewed"
    extra: dict[str, Any] = field(default_factory=dict)

    def citation(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "module": self.module,
            "route": self.route,
            "sourceDocument": self.source_document,
            "sourceLocation": self.source_location,
            "slide": self.slide,
            "contentVersion": self.content_version,
            "entryStatus": self.entry_status,
            "reviewState": self.review_state,
        }


def _review_state(review: dict[str, Any] | None) -> str:
    if review and review.get("reviewedDate"):
        return f"clinically reviewed {review['reviewedDate']} by {review.get('reviewedBy') or 'unnamed reviewer'}"
    return "not yet clinically reviewed"


def _guidance_text(title: str, block: dict[str, Any]) -> str:
    """Flatten a ClinicalGuidance-shaped block into prose for embedding."""
    parts = [title]
    if block.get("interpretation"):
        parts.append(f"Interpretation: {block['interpretation']}")
    for label, key in (
        ("Actions", "actions"),
        ("Considerations", "considerations"),
        ("Escalation", "escalation"),
        ("Steps", "steps"),
        ("Not answered by the current source", "gaps"),
    ):
        values = block.get(key)
        if values:
            joined = " ".join(f"- {v}" for v in values)
            parts.append(f"{label}: {joined}")
    if block.get("details"):
        rows = " ".join(f"{d['label']}: {d['value']}." for d in block["details"])
        parts.append(rows)
    return "\n".join(parts)


def build_chunks() -> list[Chunk]:
    """Assemble the full approved corpus. Deterministic and cheap to rebuild."""
    version = content.load("version")
    cv = version["contentVersion"]
    doc = version["sourceDocument"]
    chunks: list[Chunk] = []

    def add(
        cid: str,
        text: str,
        title: str,
        module: str,
        route: str,
        source: dict[str, Any] | None = None,
        review: dict[str, Any] | None = None,
        entry_status: str = "documented",
        **extra: Any,
    ) -> None:
        source = source or {}
        chunks.append(
            Chunk(
                id=cid,
                text=text.strip(),
                title=title,
                module=module,
                route=route,
                source_document=source.get("document", doc),
                source_location=source.get("location"),
                slide=source.get("slide"),
                content_version=extra.pop("content_version", cv),
                entry_status=entry_status,
                review_state=_review_state(review),
                extra=extra,
            )
        )

    # --- Tennessee prescribing -------------------------------------------
    presc = content.load("prescribing")
    for p in presc["pathways"]:
        match = p.get("match", {})
        criteria = ", ".join(f"{k}={v}" for k, v in match.items()) or "any patient"
        add(
            p["id"],
            f"Tennessee prescribing pathway. Applies when {criteria}.\n"
            + _guidance_text(p["title"], p),
            p["title"],
            "Tennessee prescribing",
            "/toolkit/prescribing",
            p.get("source"),
            p.get("review"),
            p.get("entryStatus", "documented"),
        )

    # --- Induction --------------------------------------------------------
    ind = content.load("induction")
    for pathway in ind["pathways"]:
        for outcome in pathway["outcomes"]:
            when = outcome.get("when") or {}
            cond = ", ".join(f"{k}={v}" for k, v in when.items()) or "the default branch"
            detox = (
                " This pathway is flagged: consider inpatient detox."
                if outcome.get("considerInpatientDetox")
                else ""
            )
            add(
                outcome["id"],
                f"Buprenorphine induction for a patient described as: "
                f"{pathway['situationLabel']}. Branch: {cond}.{detox}\n"
                + _guidance_text(outcome["title"], outcome),
                f"{pathway['situationLabel']} — {outcome['title']}",
                "Induction",
                "/toolkit/start",
                outcome.get("source"),
                outcome.get("review"),
                outcome.get("entryStatus", "documented"),
            )

    # --- UDS --------------------------------------------------------------
    uds = content.load("uds")
    for rule in uds["rules"]:
        match = rule.get("match", {})
        criteria = ", ".join(f"{k}={v}" for k, v in match.items())
        add(
            rule["id"],
            f"Urine drug screen interpretation. Matches when {criteria}.\n"
            + _guidance_text(rule["title"], rule),
            rule["title"],
            "UDS interpretation",
            "/toolkit/uds",
            rule.get("source"),
            rule.get("review"),
            rule.get("entryStatus", "documented"),
        )
    mon = uds["monitoring"]
    add(
        "uds_monitoring",
        _guidance_text(mon["title"], mon),
        mon["title"],
        "UDS interpretation",
        "/toolkit/uds",
        mon.get("source"),
        mon.get("review"),
    )

    # --- Dosing -----------------------------------------------------------
    dosing = content.load("dosing")
    for key, route_title in (
        ("overview", "Maintenance dosing overview"),
        ("limits", "FDA label vs Tennessee dose limits"),
        ("cravingsNo", "Cravings controlled"),
        ("cravingsYes", "Cravings continuing"),
    ):
        block = dosing[key]
        add(
            block.get("id", f"dosing_{key}"),
            _guidance_text(block.get("title", route_title), block),
            block.get("title", route_title),
            "Maintenance dosing",
            "/toolkit/dosing",
            block.get("source"),
            block.get("review"),
            block.get("entryStatus", "documented"),
        )

    # --- Education --------------------------------------------------------
    learn = content.load("learn")["buprenorphine"]
    add(
        "learn_buprenorphine",
        _guidance_text(learn.get("title", "Buprenorphine-naloxone basics"), learn),
        learn.get("title", "Buprenorphine-naloxone basics"),
        "Education",
        "/learn/buprenorphine",
        learn.get("source"),
        learn.get("review"),
    )

    # --- Referrals --------------------------------------------------------
    for org in content.load("referrals")["organizations"]:
        facts = [f"{org['name']} is a referral option in the All4Knox directory."]
        if org.get("organizationType"):
            facts.append(f"Type: {org['organizationType']}.")
        if org.get("services"):
            facts.append(f"Services: {', '.join(org['services'])}.")
        if org.get("region"):
            facts.append(f"Regions: {', '.join(org['region'])}.")
        if org.get("grantFunded"):
            facts.append("Offers grant-funded treatment.")
        if org.get("notes"):
            facts.append(str(org["notes"]))
        # Contact details are deliberately unverified; say so in the chunk so a
        # retrieved answer cannot imply a phone number exists.
        unverified = [
            f for f in ("address", "phone", "website") if not org.get(f)
        ]
        if unverified:
            facts.append(
                "Contact details not yet verified: " + ", ".join(unverified) + "."
            )
        add(
            f"referral_{org['id']}",
            " ".join(facts),
            org["name"],
            "Referral directory",
            "/referrals",
            org.get("source"),
            None,
            "partial",
        )

    # --- Governance -------------------------------------------------------
    gov = content.load("governance")
    add(
        "governance_emergency",
        f"Emergency and high-risk guidance. {gov['emergencyNotice']}",
        "Emergency notice",
        "Governance",
        "/about",
    )
    add(
        "governance_scope",
        f"{gov['decisionSupportLabel']}: {gov['decisionSupportNote']} "
        f"Privacy: {gov['phiNotice']}",
        "Scope and limitations",
        "Governance",
        "/about",
    )

    return chunks
