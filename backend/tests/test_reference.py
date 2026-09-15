"""
Integrity of the reference collections the assistant searches.

The passages files are generated from PDFs that are not inside the API image,
so these tests check what the generator produced rather than re-running it:
every document has passages, no excluded page leaked in, every transcription
says who made it and whether it has been checked, and every chunk carries the
labels the assistant needs to tell one kind of source from another.
"""

import json

import pytest

from app.rag import reference
from app.rag.tools import SEARCH_TOOLS, by_name

DOCUMENTS = reference.manifest()["documents"]


def test_every_document_belongs_to_a_search_tool():
    collections = {tool.collection for tool in SEARCH_TOOLS}
    for doc in DOCUMENTS:
        assert doc["collection"] in collections, doc["id"]


@pytest.mark.parametrize("doc", DOCUMENTS, ids=lambda d: d["id"])
def test_document_metadata_is_complete(doc):
    for key in ("title", "shortTitle", "issuer", "published", "edition", "documentType", "sourceFile", "currencyNote"):
        assert doc.get(key), f"{doc['id']} is missing {key}"
    for group in doc["excludedPages"]:
        assert group["reason"].strip(), f"{doc['id']}: every exclusion needs a reason"


@pytest.mark.parametrize("doc", DOCUMENTS, ids=lambda d: d["id"])
def test_passages_exist_and_respect_exclusions(doc):
    path = reference.REFERENCE_DIR / "passages" / f"{doc['id']}.json"
    data = json.loads(path.read_text())
    assert data["documentId"] == doc["id"]
    assert data["passages"], f"{doc['id']} produced no passages"

    excluded = {p for g in doc["excludedPages"] for p in g["pages"]}
    for p in data["passages"]:
        assert p["text"].strip() and p["section"], p["id"]
        assert 1 <= p["pageStart"] <= p["pageEnd"], p["id"]
        assert p["method"] in {"extracted", "transcribed"}, p["id"]
        if p["method"] == "extracted":
            pages = set(range(p["pageStart"], p["pageEnd"] + 1))
            assert not pages & excluded, f"{p['id']} contains excluded page(s) {pages & excluded}"


def test_transcriptions_record_who_made_them_and_whether_checked():
    """
    A transcription is All4Knox's own rendering of a page image, so fidelity is
    All4Knox's responsibility. It must say who transcribed it, and the served
    label must not claim a check that has not happened.
    """
    seen = 0
    for doc in DOCUMENTS:
        for p in reference.passages(doc["id"]):
            if p["method"] != "transcribed":
                continue
            seen += 1
            assert p["transcribedBy"] and p["transcribedDate"], p["id"]
            assert "checkedBy" in p, p["id"]
            note = reference.fidelity_note(p)
            if p["checkedBy"] is None:
                assert "not yet checked" in note, p["id"]
            else:
                assert p["checkedBy"] in note, p["id"]
    assert seen, "expected at least one transcribed passage"


def test_chunk_ids_are_unique_across_every_collection():
    ids = [chunk.id for tool in SEARCH_TOOLS for chunk in tool.build()]
    assert len(ids) == len(set(ids))


@pytest.mark.parametrize("name", ["search_tn_buprenorphine_guidelines", "search_tenncare_besmart"])
def test_reference_chunks_carry_source_labels(name):
    tool = by_name(name)
    chunks = tool.build()
    assert chunks
    for chunk in chunks:
        assert chunk.collection == tool.collection
        assert chunk.authority == tool.authority
        assert chunk.issuer and chunk.published and chunk.pages
        assert chunk.currency_note
        # The heading line is embedded with the text so section names retrieve.
        assert chunk.text.startswith(chunk.module + " — ")


def test_superseded_program_description_says_so():
    """The March 2023 description is known to be out of date in part."""
    chunks = by_name("search_tenncare_besmart").build()
    pd_2023 = [c for c in chunks if c.id.startswith("tenncare-besmart-pd-2023:")]
    assert pd_2023
    assert all("SUPERSEDED IN PART" in c.currency_note for c in pd_2023)


def test_tool_schemas_are_callable_shapes():
    for tool in SEARCH_TOOLS:
        schema = tool.schema()
        assert schema["function"]["name"] == tool.name
        assert schema["function"]["parameters"]["required"] == ["query"]
