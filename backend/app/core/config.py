"""Application settings, read from the environment (see .env.example)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Every tunable in one place. Values come from the container environment."""

    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    app_env: str = "production"

    # --- Ollama ------------------------------------------------------------
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_username: str = ""
    ollama_password: str = ""
    ollama_model: str = "gpt-oss:20b"
    ollama_embedding_model: str = "nomic-embed-text:latest"
    ollama_timeout: int = 120

    # --- retrieval ---------------------------------------------------------
    vector_store_path: Path = Path("/data/vector_store/all4knox_index.npz")
    rag_top_k: int = 6
    # Below this cosine score the model is never called at all, so it cannot
    # answer from its own weights — the enforcement half of the §23 guardrail.
    # The value is measured, not guessed: see backend/tools/calibrate_threshold.py.
    # Re-measure after changing the embedding model or growing the corpus.
    rag_min_score: float = 0.65
    rag_auto_ingest: bool = True

    assistant_enabled: bool = True

    cors_origins: str = "http://localhost:5173,http://localhost:8411"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def ollama_auth(self) -> tuple[str, str] | None:
        """BasicAuth pair when talking to the authenticated Ollama proxy."""
        if self.ollama_username and self.ollama_password:
            return (self.ollama_username, self.ollama_password)
        return None


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Directory holding the JSON exported from frontend/src/content.
CONTENT_DIR = Path(__file__).resolve().parent.parent / "data" / "content"
