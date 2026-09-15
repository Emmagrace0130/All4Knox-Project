"""
Retrieval across collections, per-source answer sections, refusal, and the
context-window budget — with a fake Ollama client, so none of this needs a GPU.
"""

import asyncio
import re

import numpy as np
import pytest

from app.core.config import Settings
from app.rag import assistant as assistant_module
from app.rag.assistant import Assistant, estimate_tokens, fit_to_window, format_passage
from app.rag.corpus import Chunk
from app.rag.ollama_client import OllamaError

DIM = 8
SHARED = DIM - 1  # an axis every stored passage leans on

AUTHORITIES = {
    "toolkit": "All4Knox toolkit content",
    "tn_guidelines": "Tennessee state clinical guideline",
    "tenncare_besmart": "TennCare BESMART program requirements (payer rules)",
}
COLLECTION_OF = {v: k for k, v in AUTHORITIES.items()}


def _vec(i: int) -> list[float]:
    v = np.zeros(DIM, dtype=np.float32)
    v[i] = 1.0
    return v.tolist()


def _passage_vec(axis: int) -> list[float]:
    """Unit vector = (e_axis + 2*e_shared)/sqrt(5): 0.894 against e_shared."""
    v = np.zeros(DIM, dtype=np.float32)
    v[axis], v[SHARED] = 1.0, 2.0
    return (v / np.linalg.norm(v)).tolist()


def _query(**weights):
    v = np.zeros(DIM, dtype=np.float32)
    for axis, w in weights.items():
        v[int(axis.lstrip("e"))] = w
    return (v / np.linalg.norm(v)).tolist()


def _chunk(cid: str, collection: str, authority: str, text: str = "passage text") -> Chunk:
    return Chunk(
        id=cid, text=text, title=cid, module="m", route="", source_document="doc",
        collection=collection, authority=authority, issuer="Issuer", published="2026-05-28",
        currency_note="note" if collection != "toolkit" else None,
    )


def _section_collections(messages) -> list[str]:
    """Which source types a single model call was shown."""
    headers = re.findall(r"^=== SOURCE TYPE: (.+) ===$", messages[-1]["content"], re.M)
    return [COLLECTION_OF[h] for h in headers]


class FakeClient:
    """
    Answers each section call with text naming the source it was shown, so a
    test can see exactly what each call could have used.
    """

    def __init__(self, query_vector, done_reason="stop", delays=None, fail=()):
        self.query_vector = query_vector
        self.done_reason = done_reason
        self.delays = delays or {}
        self.fail = set(fail)
        self.chat_calls = []

    async def embed(self, texts):
        return [self.query_vector for _ in texts]

    def _reply(self, messages):
        [collection] = _section_collections(messages)
        return collection, f"answer from {collection}"

    async def chat(self, messages, options=None, model=None, usage=None):
        self.chat_calls.append((messages, options))
        collection, text = self._reply(messages)
        if collection in self.fail:
            raise OllamaError(f"{collection} failed")
        if usage is not None:
            usage.update(promptTokens=100, outputTokens=10, doneReason=self.done_reason)
        return text

    async def chat_stream(self, messages, options=None, model=None, usage=None):
        self.chat_calls.append((messages, options))
        collection, text = self._reply(messages)
        await asyncio.sleep(self.delays.get(collection, 0))
        if collection in self.fail:
            raise OllamaError(f"{collection} failed")
        for word in text.split(" "):
            yield word + " "
        if usage is not None:
            usage.update(promptTokens=100, outputTokens=10, doneReason=self.done_reason)


@pytest.fixture
def assistant(monkeypatch, tmp_path):
    monkeypatch.setattr(assistant_module.generation, "get_settings", lambda _uid: {})
    monkeypatch.setattr(assistant_module.generation, "active_prompt_body", lambda fallback: fallback)
    instance = Assistant(Settings(vector_store_path=tmp_path / "toolkit.npz"))
    for axis, (collection, authority) in enumerate(AUTHORITIES.items()):
        chunk = _chunk(f"{collection}-1", collection, authority)
        instance.stores[collection].replace([chunk], [_passage_vec(axis)], "fp")
    return instance


def _stream(assistant, question="dose limit?"):
    async def collect():
        return [event async for event in assistant.ask_stream(question)]
    return asyncio.run(collect())


# --- per-source sections ---------------------------------------------------
def test_each_model_call_sees_only_one_source(assistant):
    """
    THE structural guarantee. A single call over every source misattributed
    thresholds between them in 3 of 3 live runs; a call that is never shown a
    second source has nothing to misattribute from.
    """
    assistant.client = FakeClient(_query(e7=1.0))  # 0.894 against every collection
    asyncio.run(assistant.ask("dose limit?"))

    shown = [_section_collections(messages) for messages, _ in assistant.client.chat_calls]
    assert sorted(shown) == [["tenncare_besmart"], ["tn_guidelines"], ["toolkit"]]


def test_sections_are_assembled_in_tool_order_under_server_written_headings(assistant):
    assistant.client = FakeClient(_query(e7=1.0))
    result = asyncio.run(assistant.ask("dose limit?"))

    headings = re.findall(r"^### (.+)$", result["answer"], re.M)
    assert headings == [tool.heading for tool in assistant.tools]
    assert result["answer"].index("answer from toolkit") < result["answer"].index("answer from tn_guidelines")
    assert [c["collection"] for c in result["citations"]] == list(AUTHORITIES)


def test_citation_numbers_are_global_across_sections(assistant):
    assistant.client = FakeClient(_query(e7=1.0))
    result = asyncio.run(assistant.ask("dose limit?"))
    assert [c["index"] for c in result["citations"]] == [1, 2, 3]

    by_collection = {_section_collections(m)[0]: m[-1]["content"] for m, _ in assistant.client.chat_calls}
    assert "[2] (source type: Tennessee state clinical guideline" in by_collection["tn_guidelines"]
    assert "[3] (source type: TennCare BESMART" in by_collection["tenncare_besmart"]


def test_single_source_answer_has_no_heading(assistant):
    # 0.707 against the guideline passage, 0.283 against the other two.
    assistant.client = FakeClient(_query(e1=3.0, e7=1.0))
    result = asyncio.run(assistant.ask("benzodiazepine co-prescribing?"))
    assert result["refused"] is False
    assert [c["collection"] for c in result["citations"]] == ["tn_guidelines"]
    assert "###" not in result["answer"]


def test_stream_keeps_section_order_when_a_later_section_finishes_first(assistant):
    assistant.client = FakeClient(_query(e7=1.0), delays={"toolkit": 0.05})
    events = _stream(assistant)
    text = "".join(e["data"]["text"] for e in events if e["event"] == "token")
    assert text.index("answer from toolkit") < text.index("answer from tn_guidelines") < text.index("answer from tenncare_besmart")
    assert events[0]["event"] == "citations" and events[-1]["event"] == "done"
    assert [u["collection"] for u in events[-1]["data"]["usage"]] == list(AUTHORITIES)


def test_one_failed_section_does_not_lose_the_others(assistant):
    assistant.client = FakeClient(_query(e7=1.0), fail={"tn_guidelines"})
    events = _stream(assistant)
    text = "".join(e["data"]["text"] for e in events if e["event"] == "token")
    assert "answer from toolkit" in text and "answer from tenncare_besmart" in text
    assert "could not be generated: tn_guidelines failed" in text
    assert events[-1]["event"] == "done"


def test_every_section_failing_is_an_error(assistant):
    assistant.client = FakeClient(_query(e7=1.0), fail=set(AUTHORITIES))
    events = _stream(assistant)
    assert events[-1]["event"] == "error"


# --- refusal, limits, budget ----------------------------------------------
def test_nothing_above_any_floor_refuses_without_calling_the_model(assistant):
    assistant.client = FakeClient(_query(e5=1.0))  # orthogonal to every passage
    result = asyncio.run(assistant.ask("warfarin dose?"))
    assert result["refused"] is True
    assert assistant.client.chat_calls == []


def test_window_and_answer_length_are_pinned_on_every_call(assistant, monkeypatch):
    monkeypatch.setattr(assistant_module.generation, "get_settings", lambda _uid: {"max_tokens": 8192})
    assistant.client = FakeClient(_query(e7=1.0))
    asyncio.run(assistant.ask("dose limit?"))
    for _messages, options in assistant.client.chat_calls:
        assert options["num_ctx"] == assistant.settings.ollama_num_ctx
        assert options["num_predict"] == assistant.settings.ollama_num_ctx // 2


def test_a_cut_off_section_says_so(assistant):
    assistant.client = FakeClient(_query(e1=3.0, e7=1.0), done_reason="length")
    result = asyncio.run(assistant.ask("benzodiazepine co-prescribing?"))
    assert result["answer"].endswith(assistant_module.TRUNCATION_NOTICE.strip())


def test_budget_keeps_best_passages_and_newest_history():
    long_text = "x" * 3000  # ~1000 estimated tokens each
    hits = [
        (_chunk("best", "toolkit", "a", long_text), 0.9),
        (_chunk("mid", "tn_guidelines", "b", long_text), 0.8),
        (_chunk("worst", "tenncare_besmart", "c", long_text), 0.7),
    ]
    history = [{"role": "user", "content": f"old {i} " + "y" * 900} for i in range(10)]

    kept, kept_history = fit_to_window("system", "question?", hits, history, num_ctx=4096, answer_tokens=1024)

    assert [c.id for c, _ in kept] == ["best", "mid"]
    assert kept_history == history[len(history) - len(kept_history):]  # a contiguous newest tail

    used = (
        estimate_tokens("system") + estimate_tokens("CONTEXT:\n\nQUESTION: question?")
        + sum(estimate_tokens(format_passage(99, c, s)) for c, s in kept)
        + sum(estimate_tokens(m["content"]) for m in kept_history)
    )
    assert used + 1024 <= 4096


def test_best_passage_is_kept_even_when_nothing_fits():
    huge = [(_chunk("only", "toolkit", "a", "x" * 50000), 0.9)]
    kept, kept_history = fit_to_window("s", "q", huge, [{"role": "user", "content": "hi"}], num_ctx=2048, answer_tokens=1024)
    assert [c.id for c, _ in kept] == ["only"]
    assert kept_history == []


# --- configuration and persistence ----------------------------------------
def test_status_reports_every_collection(assistant):
    async def health():
        return {"reachable": True}
    assistant.client = FakeClient(_vec(0))
    assistant.client.health = health
    status = asyncio.run(assistant.status())
    assert [c["tool"] for c in status["collections"]] == [
        "search_toolkit_content", "search_tn_buprenorphine_guidelines", "search_tenncare_besmart",
    ]
    assert all(c["index"]["ready"] for c in status["collections"])


def test_reference_collections_can_be_switched_off(tmp_path):
    instance = Assistant(Settings(vector_store_path=tmp_path / "t.npz", rag_reference_enabled=False))
    assert [t.collection for t in instance.tools] == ["toolkit"]
    assert list(instance.stores) == ["toolkit"]


def test_index_round_trips_through_an_atomic_save(tmp_path):
    from app.rag.store import VectorStore

    store = VectorStore(tmp_path / "idx.npz")
    store.replace([_chunk("a", "tn_guidelines", "guideline")], [_passage_vec(1)], "fp1")
    store.save()
    assert [p.name for p in tmp_path.iterdir()] == ["idx.npz"]  # no temp file left behind

    loaded = VectorStore(tmp_path / "idx.npz")
    assert loaded.load() and loaded.fingerprint == "fp1"
    assert loaded.search(_passage_vec(1), 1, 0.5)[0][0].collection == "tn_guidelines"
