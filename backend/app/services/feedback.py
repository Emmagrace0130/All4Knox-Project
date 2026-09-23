"""
Site feedback: the header "Feedback" survey.

Anyone can submit, visitors included — the people most worth hearing from
during the pilot are testers who never make an account. Every question is
optional, but an empty submission is refused so the inbox holds only real
responses.

The question set lives HERE and only here: the React form fetches it from
`GET /api/feedback/questions`, and the export reads the labels from it. Add or
reword a question by editing a tuple below. Stored answers are JSON, so no
migration is needed; reword rather than reuse an id if the meaning changes,
or old responses will be exported under the new wording.

Triage happens outside the app: `./a4k feedback` writes each response as a
Markdown file into `feedback/inbox/`, and the maintainer moves files between
folders as they decide. See feedback/README.md.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from app.core import db
from app.services.auth import now

# (id, question, low label, high label). Scores are 1-5.
RATINGS: tuple[tuple[str, str, str, str], ...] = (
    ("ease", "How easy is the site to use?", "Very hard", "Very easy"),
    ("format", "How much do you like the layout and format?", "Not at all", "Very much"),
    ("clarity", "How clear is the information?", "Very unclear", "Very clear"),
    ("usefulness", "How useful would this be in your clinical work?", "Not useful", "Very useful"),
    ("trust", "How much do you trust the information it gives?", "Not at all", "Completely"),
)

# (id, question, {value: label})
CHOICES: tuple[tuple[str, str, dict[str, str]], ...] = (
    (
        "role",
        "What is your role?",
        {
            "physician": "Physician",
            "np_pa": "Nurse practitioner / PA",
            "nurse": "Nurse",
            "pharmacist": "Pharmacist",
            "behavioral_health": "Behavioral health / counselor",
            "staff": "Clinic or admin staff",
            "student": "Student / trainee",
            "other": "Other",
        },
    ),
    (
        "found",
        "Did you find what you were looking for?",
        {"yes": "Yes", "partly": "Partly", "no": "No", "browsing": "Just exploring"},
    ),
)

# (id, question)
TEXTS: tuple[tuple[str, str], ...] = (
    ("task", "What were you trying to do?"),
    ("worked", "What worked well?"),
    ("improve", "What was confusing, missing or wrong?"),
    ("suggestions", "Any other suggestions or features you would like?"),
)

MAX_TEXT = 4000

_RATING_IDS = {r[0] for r in RATINGS}
_CHOICE_OPTIONS = {c[0]: c[2] for c in CHOICES}
_TEXT_IDS = {t[0] for t in TEXTS}


def questions() -> dict[str, Any]:
    return {
        "ratings": [
            {"id": i, "question": q, "low": lo, "high": hi} for i, q, lo, hi in RATINGS
        ],
        "choices": [
            {"id": i, "question": q, "options": [{"value": v, "label": l} for v, l in o.items()]}
            for i, q, o in CHOICES
        ],
        "texts": [{"id": i, "question": q} for i, q in TEXTS],
        "maxText": MAX_TEXT,
    }


def _clean_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value[:MAX_TEXT] or None


def submit(
    session: dict[str, Any],
    ratings: dict[str, Any],
    answers: dict[str, Any],
    page: str | None,
    content_version: str | None,
    contact_email: str | None,
    user_agent: str | None,
    viewport: str | None,
) -> dict[str, Any]:
    """
    Validate and store one response. Unknown keys are dropped, not rejected:
    a browser holding an older copy of the form must still be able to submit.
    """
    clean_ratings: dict[str, int] = {}
    for key, value in ratings.items():
        if key not in _RATING_IDS or value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 5:
            raise ValueError(f"rating '{key}' must be a whole number from 1 to 5")
        clean_ratings[key] = value

    clean_answers: dict[str, str] = {}
    for key, value in answers.items():
        if key in _CHOICE_OPTIONS:
            if value in (None, ""):
                continue
            if value not in _CHOICE_OPTIONS[key]:
                raise ValueError(f"'{value}' is not an option for '{key}'")
            clean_answers[key] = value
        elif key in _TEXT_IDS:
            text = _clean_text(value)
            if text:
                clean_answers[key] = text

    if not clean_ratings and not clean_answers:
        raise ValueError("the survey is empty — answer at least one question")

    record = {
        "id": uuid.uuid4().hex,
        "createdAt": now(),
        "page": (page or "")[:300] or None,
        "contentVersion": (content_version or "")[:40] or None,
        "userId": session.get("userId"),
        "userRole": session.get("role", "visitor"),
        "ratings": clean_ratings,
        "answers": clean_answers,
        "contactEmail": _clean_text(contact_email),
        "userAgent": (user_agent or "")[:400] or None,
        "viewport": (viewport or "")[:40] or None,
    }
    db.execute(
        """INSERT INTO feedback (id, created_at, page, content_version, user_id,
               user_role, ratings, answers, contact_email, user_agent, viewport)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            record["id"],
            record["createdAt"],
            record["page"],
            record["contentVersion"],
            record["userId"],
            record["userRole"],
            json.dumps(record["ratings"]),
            json.dumps(record["answers"]),
            record["contactEmail"],
            record["userAgent"],
            record["viewport"],
        ),
    )
    return record


def _row(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "createdAt": row["created_at"],
        "page": row["page"],
        "contentVersion": row["content_version"],
        "userRole": row["user_role"],
        "ratings": json.loads(row["ratings"]),
        "answers": json.loads(row["answers"]),
        "contactEmail": row["contact_email"],
        "userAgent": row["user_agent"],
        "viewport": row["viewport"],
    }


def list_all() -> list[dict[str, Any]]:
    """Every response, oldest first."""
    return [_row(r) for r in db.query("SELECT * FROM feedback ORDER BY created_at")]


def filename(record: dict[str, Any]) -> str:
    """Sortable and unique: 2026-09-23_1415_ab12cd34.md (UTC)."""
    stamp = record["createdAt"][:16].replace("T", "_").replace(":", "")
    return f"{stamp}_{record['id'][:8]}.md"


def to_markdown(record: dict[str, Any]) -> str:
    lines = [
        f"# Feedback {record['id'][:8]}",
        "",
        f"- **Received:** {record['createdAt'][:19].replace('T', ' ')} UTC",
        f"- **Page:** `{record['page'] or 'unknown'}`",
        f"- **Signed in as:** {record['userRole']}",
        f"- **Content version:** {record['contentVersion'] or 'unknown'}",
        f"- **Screen:** {record['viewport'] or 'unknown'}",
    ]
    if record["contactEmail"]:
        lines.append(f"- **Contact:** {record['contactEmail']}")

    lines += ["", "## Ratings (1–5)", ""]
    for key, question, low, high in RATINGS:
        score = record["ratings"].get(key)
        shown = f"**{score}**" if score is not None else "—"
        lines.append(f"- {question} {shown}  _(1 = {low}, 5 = {high})_")

    lines += ["", "## Answers", ""]
    for key, question, options in CHOICES:
        value = record["answers"].get(key)
        shown = f"**{options.get(value, value)}**" if value else "—"
        lines.append(f"- {question} {shown}")

    for key, question in TEXTS:
        text = record["answers"].get(key)
        lines += ["", f"### {question}", "", text if text else "—"]

    lines += ["", "---", f"Browser: {record['userAgent'] or 'unknown'}", ""]
    return "\n".join(lines)


def export() -> list[dict[str, str]]:
    """What `./a4k feedback` writes: one Markdown file per response."""
    return [{"filename": filename(r), "markdown": to_markdown(r)} for r in list_all()]
