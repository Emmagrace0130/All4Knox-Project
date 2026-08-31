"""
Calibrates RAG_MIN_SCORE — the retrieval floor below which the assistant
refuses instead of answering.

Why this matters: the floor is the structural half of the clinical-safety
guardrail. The system prompt tells the model to refuse when the context does
not answer the question, but a prompt is advice. The floor is enforcement —
below it, the model is never called at all, so it cannot answer from its own
weights no matter what the question says.

Setting the floor by intuition does not work. Every chunk in this corpus is
clinical prose, so an unrelated clinical question ("warfarin dosing") still
scores moderately against all of it. The floor has to sit in the measured gap
between questions the content answers and questions it does not.

Usage (with the stack running):
    python backend/tools/calibrate_threshold.py

Re-run this whenever OLLAMA_EMBEDDING_MODEL changes or the corpus grows —
the separation gap moves, and a stale floor either leaks unanswerable
questions through or refuses questions the content does answer.
"""

from __future__ import annotations

import json
import math
import subprocess
import urllib.request

OLLAMA_URL = "http://localhost:11434/api/embed"
EMBED_MODEL = "nomic-embed-text:latest"
CONTAINER = "all4knox-api"

# Questions the approved content DOES answer.
ON_CORPUS = [
    "How should I interpret BUP positive with fentanyl on the same screen?",
    "My patient has TennCare and is not BESMART enrolled, can I prescribe?",
    "What do I do when a patient still has cravings on 16 mg?",
    "How do I start buprenorphine for someone using fentanyl?",
    "What if the urine drug screen is negative for buprenorphine?",
    "Where can I refer an uninsured patient in Knoxville?",
]

# Clinical questions the approved content does NOT answer. These are all
# plausible things a primary care provider might type, which is the point:
# the floor has to reject them without rejecting the list above.
OFF_CORPUS = [
    "What is the recommended warfarin dose for atrial fibrillation?",
    "How do I manage type 2 diabetes with metformin?",
    "What antibiotics treat community acquired pneumonia?",
    "How should I work up a patient with chest pain?",
    "What is the best treatment for eczema in children?",
    "How do I read an ECG showing left bundle branch block?",
]


def embed(texts: list[str]) -> list[list[float]]:
    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps({"model": EMBED_MODEL, "input": texts}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.load(response)["embeddings"]


def normalise(vector: list[float]) -> list[float]:
    length = math.sqrt(sum(x * x for x in vector)) or 1.0
    return [x / length for x in vector]


def load_corpus() -> list[dict]:
    """Read the corpus from the running API so this measures what ships."""
    output = subprocess.run(
        [
            "docker", "exec", CONTAINER, "python", "-c",
            "import json;from app.rag.corpus import build_chunks;"
            "print(json.dumps([{'id':c.id,'text':c.text} for c in build_chunks()]))",
        ],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return json.loads(output)


def main() -> None:
    chunks = load_corpus()
    corpus = [normalise(v) for v in embed([c["text"] for c in chunks])]
    print(f"corpus: {len(chunks)} chunks, {len(corpus[0])} dimensions\n")

    def top_score(question: str) -> float:
        query = normalise(embed([question])[0])
        return max(sum(a * b for a, b in zip(query, vec)) for vec in corpus)

    print(f"{'':4}{'question':<60} {'top score':>10}")
    print("-" * 76)
    on = []
    for question in ON_CORPUS:
        score = top_score(question)
        on.append(score)
        print(f"ON  {question[:58]:<60} {score:>10.3f}")
    print("-" * 76)
    off = []
    for question in OFF_CORPUS:
        score = top_score(question)
        off.append(score)
        print(f"OFF {question[:58]:<60} {score:>10.3f}")
    print("-" * 76)

    floor, ceiling = max(off), min(on)
    print(f"on-corpus  minimum : {ceiling:.3f}")
    print(f"off-corpus maximum : {floor:.3f}")
    if ceiling > floor:
        print(f"\nseparation gap     : {floor:.3f} .. {ceiling:.3f} (width {ceiling - floor:+.3f})")
        print(f"RAG_MIN_SCORE      : {(floor + ceiling) / 2:.2f}   <- set this in .env")
    else:
        print(
            "\nNO CLEAN SEPARATION. The floor cannot distinguish these questions. "
            "Do not raise it blindly — investigate the corpus or the embedding "
            "model before relying on retrieval to gate answers."
        )


if __name__ == "__main__":
    main()
