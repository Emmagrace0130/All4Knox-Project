"""Site feedback: validation, persistence and the Markdown export."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from app.core import db
from app.services import feedback

VISITOR = {"id": "s", "userId": None, "role": "visitor", "user": None}


@pytest.fixture(autouse=True)
def temp_db():
    with tempfile.TemporaryDirectory() as tmp:
        db.configure(Path(tmp) / "test.db")
        db._local.conn = None
        yield


def _submit(ratings=None, answers=None, **kw):
    return feedback.submit(
        VISITOR,
        ratings or {},
        answers or {},
        kw.get("page", "/toolkit/uds"),
        "2026.2",
        kw.get("email"),
        "pytest",
        "1280x800",
    )


def test_visitor_can_submit_and_it_is_stored():
    _submit({"ease": 4, "format": 5}, {"role": "nurse", "improve": "  More examples  "})
    [stored] = feedback.list_all()
    assert stored["userRole"] == "visitor"
    assert stored["ratings"] == {"ease": 4, "format": 5}
    assert stored["answers"] == {"role": "nurse", "improve": "More examples"}
    assert stored["page"] == "/toolkit/uds"


def test_empty_survey_is_refused():
    with pytest.raises(ValueError, match="empty"):
        _submit({"ease": None}, {"improve": "   ", "role": ""})
    assert feedback.list_all() == []


@pytest.mark.parametrize("bad", [0, 6, 3.5, "4", True])
def test_rating_must_be_1_to_5(bad):
    with pytest.raises(ValueError, match="1 to 5"):
        _submit({"ease": bad})


def test_unknown_choice_value_is_refused():
    with pytest.raises(ValueError, match="not an option"):
        _submit(answers={"role": "astronaut"})


def test_unknown_keys_are_dropped_not_rejected():
    """An older copy of the form in someone's browser must still submit."""
    record = _submit({"ease": 3, "retired_question": 5}, {"old_text": "x"})
    assert record["ratings"] == {"ease": 3}
    assert record["answers"] == {}


def test_long_text_is_truncated():
    record = _submit(answers={"suggestions": "a" * (feedback.MAX_TEXT + 500)})
    assert len(record["answers"]["suggestions"]) == feedback.MAX_TEXT


def test_questions_cover_every_stored_key():
    q = feedback.questions()
    ids = [r["id"] for r in q["ratings"]] + [c["id"] for c in q["choices"]] + [
        t["id"] for t in q["texts"]
    ]
    assert len(ids) == len(set(ids)), "question ids must be unique across types"


def test_export_is_one_markdown_file_per_response():
    _submit({"ease": 2}, {"found": "partly", "improve": "The UDS page was slow"}, email="a@b.org")
    _submit({"trust": 5})
    files = feedback.export()
    assert len(files) == 2
    assert len({f["filename"] for f in files}) == 2
    first = files[0]
    assert first["filename"].endswith(".md")
    md = first["markdown"]
    assert "How easy is the site to use? **2**" in md
    assert "Did you find what you were looking for? **Partly**" in md
    assert "The UDS page was slow" in md
    assert "a@b.org" in md
