"""
The assistant's search tools — one per collection, split by WHO ISSUED the text.

WHY SEPARATE TOOLS, NOT ONE SEARCH WITH A FILTER
------------------------------------------------
The collections answer the same questions differently, on purpose. Asked
"what is the maximum buprenorphine dose in Tennessee?":

  * the All4Knox toolkit (slide 11) says 16 mg for NPs/PAs, 20 mg for most
    physicians;
  * the state guideline (2023) requires documented justification above 16 mg;
  * TennCare BESMART (May 2026) allows BESMART MDs/DOs 32 mg without prior
    authorization.

None of those is wrong — one is a teaching summary, one a clinical guideline,
one a payer's coverage rule — but a single merged search hands a model all
three as interchangeable text, and a small model will blend them into one
number. Keeping each issuer's documents in its own tool means every passage
arrives already labelled with what kind of rule it is, and the tool a model
picks (when a model picks) IS that label; there is no source parameter for it
to get wrong. The measured refusal floor also differs per collection, because
a 56-page guideline scores higher against unrelated clinical questions than 31
short toolkit blocks do.

HOW THEY ARE USED TODAY
-----------------------
Ask All4Knox does not let the model choose. The server runs every tool on
every question (see Assistant._retrieve), so a model cannot skip retrieval and
answer from memory, and the refusal floor is enforced before the model is
called. Each tool that returns passages then gets its own model call that sees
only those passages (Assistant._plan_sections), because a single call over all
of them was measured misattributing thresholds between sources. `schema()` exists so the same tools can be offered to a tool-calling
agent later (project plan 2.5.4) without being rewritten.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from app.rag import corpus, reference
from app.rag.corpus import Chunk
from app.rag.store import VectorStore


@dataclass(frozen=True)
class SearchTool:
    name: str
    collection: str
    label: str
    authority: str
    heading: str  # section heading the server writes above this source's answer
    description: str
    index_file: str | None  # None: the toolkit's existing VECTOR_STORE_PATH
    # Cosine floor below which a passage is not returned. None: RAG_MIN_SCORE.
    # Measured per collection with backend/tools/calibrate_threshold.py.
    min_score: float | None
    top_k: int | None  # None: RAG_TOP_K
    build: Callable[[], list[Chunk]]

    def floor(self, default: float) -> float:
        return default if self.min_score is None else self.min_score

    def limit(self, default: int) -> int:
        return default if self.top_k is None else self.top_k

    def search(
        self,
        store: VectorStore,
        query_embedding: list[float],
        default_floor: float,
        default_top_k: int,
    ) -> list[tuple[Chunk, float]]:
        return store.search(
            query_embedding, self.limit(default_top_k), self.floor(default_floor)
        )

    def schema(self) -> dict[str, Any]:
        """Function-calling schema in the shape Ollama's /api/chat `tools` accepts."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": (
                                "A self-contained search query in plain clinical "
                                "language. Do not include patient-identifying details."
                            ),
                        }
                    },
                    "required": ["query"],
                },
            },
        }


TOOLKIT_AUTHORITY = "All4Knox toolkit content"
GUIDELINE_AUTHORITY = "Tennessee state clinical guideline"
BESMART_AUTHORITY = "TennCare BESMART program requirements (payer rules)"

SEARCH_TOOLS: tuple[SearchTool, ...] = (
    SearchTool(
        name="search_toolkit_content",
        collection="toolkit",
        label="All4Knox toolkit",
        authority=TOOLKIT_AUTHORITY,
        heading="All4Knox toolkit",
        description=(
            "Search the All4Knox toolkit's own clinical content: Tennessee "
            "prescribing pathways, buprenorphine induction, urine drug screen "
            "interpretation, maintenance dosing, education and the referral "
            "directory. Transcribed from the All4Knox Clinical Summary 2026."
        ),
        index_file=None,
        min_score=None,
        top_k=None,
        build=corpus.build_chunks,
    ),
    SearchTool(
        name="search_tn_buprenorphine_guidelines",
        collection="tn_guidelines",
        label="TN buprenorphine guidelines",
        authority=GUIDELINE_AUTHORITY,
        heading="Tennessee buprenorphine treatment guidelines (state, Fall 2023)",
        description=(
            "Search the Tennessee Nonresidential Buprenorphine Treatment "
            "Guidelines (TDMHSAS/TDH, Fall 2023): assessment and diagnosis, "
            "consent, pregnancy, benzodiazepine co-prescribing, induction and "
            "dosing, monitoring, tapering, special populations, COWS, and the "
            "Tennessee statutes on buprenorphine prescribing."
        ),
        index_file="tn_guidelines.npz",
        # Measured 2026-09-15 (nomic-embed-text, 70 passages): on-corpus
        # questions 0.682-0.844, plainly off-corpus max 0.602 (chest pain
        # work-up). The narrowest gap of the three collections.
        min_score=0.64,
        top_k=4,
        build=lambda: reference.build_chunks("tn_guidelines", GUIDELINE_AUTHORITY),
    ),
    SearchTool(
        name="search_tenncare_besmart",
        collection="tenncare_besmart",
        label="TennCare BESMART",
        authority=BESMART_AUTHORITY,
        heading="TennCare BESMART (payer program rules)",
        description=(
            "Search TennCare's BESMART program material: network provider "
            "requirements, treatment phases, drug screen and counseling "
            "requirements, prior authorization and dose limits for "
            "buprenorphine products, billing codes, and quality review "
            "standards. These are payer coverage rules, not clinical guidance."
        ),
        index_file="tenncare_besmart.npz",
        # Measured 2026-09-15 (nomic-embed-text, 34 passages): on-corpus
        # questions 0.705-0.833, plainly off-corpus max 0.562 (warfarin).
        min_score=0.63,
        top_k=4,
        build=lambda: reference.build_chunks("tenncare_besmart", BESMART_AUTHORITY),
    ),
)


def by_name(name: str) -> SearchTool:
    for tool in SEARCH_TOOLS:
        if tool.name == name:
            return tool
    raise KeyError(name)
