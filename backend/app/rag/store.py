"""
File-backed vector store: a numpy matrix of L2-normalised embeddings plus the
chunk metadata, persisted as a single `.npz`.

WHY NOT A VECTOR DATABASE
-------------------------
The approved corpus is the reviewed clinical content — on the order of tens of
chunks, not millions. An exact cosine scan over that is sub-millisecond, gives
exact (not approximate) recall, adds no container to a shared server, and has
no migration or connection-pool failure modes during a live demo.

If the corpus later grows past ~50k chunks, replace `VectorStore.search` with a
Qdrant or pgvector client; nothing outside this module needs to change, since
`search()` is the only entry point the assistant uses.
"""

from __future__ import annotations

import json
import os
from dataclasses import asdict
from pathlib import Path
from typing import Any

import numpy as np

from app.rag.corpus import Chunk


def _normalise(matrix: np.ndarray) -> np.ndarray:
    """L2-normalise rows so a dot product is cosine similarity."""
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return matrix / norms


class VectorStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._vectors: np.ndarray | None = None
        self._chunks: list[Chunk] = []
        self._fingerprint: str = ""

    # -- persistence -------------------------------------------------------
    @property
    def ready(self) -> bool:
        return self._vectors is not None and len(self._chunks) > 0

    @property
    def size(self) -> int:
        return len(self._chunks)

    @property
    def fingerprint(self) -> str:
        return self._fingerprint

    def save(self) -> None:
        """
        Write atomically. Every uvicorn worker builds a missing index on boot,
        so two processes can save the same file at once; writing to a private
        temp file and renaming means a reader sees one whole index or the
        other, never an interleaving of both.
        """
        if self._vectors is None:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_name(f"{self.path.name}.{os.getpid()}.tmp")
        with open(tmp, "wb") as handle:
            np.savez_compressed(
                handle,
                vectors=self._vectors,
                chunks=np.array(
                    [json.dumps(asdict(c)) for c in self._chunks], dtype=object
                ),
                fingerprint=np.array([self._fingerprint], dtype=object),
            )
        os.replace(tmp, self.path)

    def load(self) -> bool:
        """Load a persisted index. Returns False when there isn't a usable one."""
        if not self.path.exists():
            return False
        try:
            data = np.load(self.path, allow_pickle=True)
            self._vectors = data["vectors"]
            self._chunks = [Chunk(**json.loads(raw)) for raw in data["chunks"]]
            self._fingerprint = str(data["fingerprint"][0])
        except Exception:  # noqa: BLE001 - a corrupt index must not block boot
            self._vectors, self._chunks, self._fingerprint = None, [], ""
            return False
        return self.ready

    # -- build / query -----------------------------------------------------
    def replace(
        self, chunks: list[Chunk], embeddings: list[list[float]], fingerprint: str
    ) -> None:
        if len(chunks) != len(embeddings):
            raise ValueError(
                f"chunk/embedding count mismatch: {len(chunks)} vs {len(embeddings)}"
            )
        self._chunks = chunks
        self._vectors = _normalise(np.asarray(embeddings, dtype=np.float32))
        self._fingerprint = fingerprint

    def search(
        self, query_embedding: list[float], top_k: int, min_score: float
    ) -> list[tuple[Chunk, float]]:
        """Chunks above `min_score`, best first. Empty list means 'refuse'."""
        if not self.ready or self._vectors is None:
            return []
        query = np.asarray(query_embedding, dtype=np.float32)
        norm = float(np.linalg.norm(query))
        if norm == 0:
            return []
        query = query / norm

        if query.shape[0] != self._vectors.shape[1]:
            # Embedding model changed since the index was built.
            raise ValueError(
                f"embedding dimension mismatch: query {query.shape[0]} vs "
                f"index {self._vectors.shape[1]}. Re-ingest the corpus after "
                "changing OLLAMA_EMBEDDING_MODEL."
            )

        scores = self._vectors @ query
        order = np.argsort(-scores)[: max(top_k, 0)]
        return [
            (self._chunks[i], float(scores[i]))
            for i in order
            if float(scores[i]) >= min_score
        ]

    def stats(self) -> dict[str, Any]:
        return {
            "ready": self.ready,
            "chunks": self.size,
            "dimensions": int(self._vectors.shape[1]) if self._vectors is not None else 0,
            "fingerprint": self._fingerprint[:12],
            "path": str(self.path),
        }
