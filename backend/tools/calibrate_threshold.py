"""
Calibrates the retrieval floors — the cosine score below which a collection
returns nothing, and below which (in every collection at once) the assistant
refuses without calling the model.

Why this matters: the floor is the structural half of the clinical-safety
guardrail. The system prompt tells the model to refuse when the context does
not answer the question, but a prompt is advice. The floor is enforcement —
below it, the model is never called at all, so it cannot answer from its own
weights no matter what the question says.

Setting a floor by intuition does not work. Every passage in these collections
is clinical prose, so an unrelated clinical question ("warfarin dosing") still
scores moderately against all of it. Each floor has to sit in the measured gap
between questions its collection answers and questions it does not — and the
gap differs per collection: a 56-page guideline covering pregnancy, surgery,
HIV and liver disease is closer to general medicine than 31 toolkit blocks.

Two kinds of off-corpus question are measured, and only one sets the floor:

  OFF    plainly outside everything (warfarin, eczema). The floor must reject
         these; they set it.
  NEAR   in the same clinical neighbourhood but not answered by the sources
         (alcohol withdrawal, methadone clinic rules). An embedding floor
         cannot be expected to reject these, and raising it until it does
         would refuse real questions. They are reported so the second layer —
         the preamble's "if the context does not contain the answer, say so"
         — is known to be doing that job, and should be spot-checked live.

Usage (from the repo root; Ollama must be reachable):
    ./a4k calibrate

Re-run whenever OLLAMA_EMBEDDING_MODEL changes or any collection's corpus
changes, then copy the printed floors into backend/app/rag/tools.py (reference
collections) and RAG_MIN_SCORE in .env (toolkit).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.rag.tools import SEARCH_TOOLS  # noqa: E402

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434") + "/api/embed"
EMBED_MODEL = os.environ.get("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text:latest")

# Questions each collection DOES answer.
ON_CORPUS = {
    "toolkit": [
        "How should I interpret BUP positive with fentanyl on the same screen?",
        "My patient has TennCare and is not BESMART enrolled, can I prescribe?",
        "What do I do when a patient still has cravings on 16 mg?",
        "How do I start buprenorphine for someone using fentanyl?",
        "What if the urine drug screen is negative for buprenorphine?",
        "Where can I refer an uninsured patient in Knoxville?",
    ],
    "tn_guidelines": [
        "What must be documented when co-prescribing benzodiazepines with buprenorphine?",
        "What COWS score is recommended before an office-based buprenorphine induction?",
        "What initial buprenorphine dose reduces the risk of precipitated withdrawal?",
        "How should precipitated withdrawal be managed?",
        "What does Tennessee law require of nurse practitioners who prescribe buprenorphine?",
        "Should buprenorphine be continued during pregnancy and breastfeeding?",
        "How should buprenorphine be managed around surgery?",
        "How is opioid use disorder severity graded from the DSM-5 criteria?",
    ],
    "tenncare_besmart": [
        "Is prior authorization required above 16 mg for non-BESMART physicians?",
        "What is the maximum daily buprenorphine dose for BESMART MD or DO providers?",
        "What billing code does BlueCare use for the BESMART stabilization phase?",
        "How often must a BESMART patient in stabilization receive psychotherapy?",
        "Who qualifies as a counselor under the BESMART program?",
        "What are the BESMART network provider eligibility requirements?",
        "How often are observed drug screens required during BESMART induction?",
    ],
}

OFF_CORPUS = [
    "What is the recommended warfarin dose for atrial fibrillation?",
    "How do I manage type 2 diabetes with metformin?",
    "What antibiotics treat community acquired pneumonia?",
    "How should I work up a patient with chest pain?",
    "What is the best treatment for eczema in children?",
    "How do I read an ECG showing left bundle branch block?",
]

NEAR_CORPUS = [
    "How do I treat alcohol withdrawal with a benzodiazepine taper?",
    "What are the federal rules for dispensing methadone at an opioid treatment program?",
    "What is the starting dose of extended-release injectable naltrexone?",
    "How do I manage a stimulant use disorder in primary care?",
]


def embed(texts: list[str]) -> np.ndarray:
    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps({"model": EMBED_MODEL, "input": texts}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        vectors = np.asarray(json.load(response)["embeddings"], dtype=np.float32)
    return vectors / np.linalg.norm(vectors, axis=1, keepdims=True)


def main() -> None:
    all_questions = sorted({q for qs in ON_CORPUS.values() for q in qs} | set(OFF_CORPUS) | set(NEAR_CORPUS))
    question_vectors = dict(zip(all_questions, embed(all_questions)))

    recommendations = {}
    for tool in SEARCH_TOOLS:
        chunks = tool.build()
        matrix = embed([c.text for c in chunks])
        top = lambda q: float(np.max(matrix @ question_vectors[q]))

        print(f"\n=== {tool.collection}  ({tool.name}: {len(chunks)} passages)")
        on = [(q, top(q)) for q in ON_CORPUS[tool.collection]]
        off = [(q, top(q)) for q in OFF_CORPUS]
        near = [(q, top(q)) for q in NEAR_CORPUS]
        for label, rows in (("ON", on), ("OFF", off), ("NEAR", near)):
            for question, score in rows:
                print(f"  {label:<4} {score:.3f}  {question}")

        ceiling = min(s for _, s in on)
        floor = max(s for _, s in off)
        if ceiling > floor:
            recommended = round((floor + ceiling) / 2, 2)
            recommendations[tool.collection] = recommended
            print(f"  on-corpus min {ceiling:.3f} | off-corpus max {floor:.3f} | gap {ceiling - floor:+.3f} | floor -> {recommended:.2f}")
        else:
            recommendations[tool.collection] = None
            print(
                f"  on-corpus min {ceiling:.3f} <= off-corpus max {floor:.3f}: NO CLEAN SEPARATION. "
                "Do not pick a floor blindly — look at which questions overlap."
            )
        leaks = [q for q, s in near if recommendations[tool.collection] and s >= recommendations[tool.collection]]
        if leaks:
            print(f"  NEAR questions that clear the floor (the preamble must refuse these): {len(leaks)}")

    print("\nRecommended floors:", json.dumps(recommendations))


if __name__ == "__main__":
    main()
