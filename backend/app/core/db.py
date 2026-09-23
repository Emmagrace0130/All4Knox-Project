"""
SQLite persistence.

Skeleton §2 sanctions "Optional PostgreSQL or SQLite depending on scale". At
this scale SQLite is the right call: no extra container on a shared server, no
connection pool to misconfigure, and the whole state is one file that can be
copied for a backup.

WAL mode matters here — the API runs 2 uvicorn workers, and without WAL a
writer would block readers across processes. With it, both workers share state
correctly through the file.
"""

from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

_local = threading.local()

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    -- basic | clinician | admin
    role          TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    last_login_at TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1
);

-- Sessions cover BOTH anonymous visitors (user_id NULL) and signed-in users.
-- A visitor session and everything hanging off it is deleted after inactivity.
CREATE TABLE IF NOT EXISTS sessions (
    id           TEXT PRIMARY KEY,
    user_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at   TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    user_agent   TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen_at);

CREATE TABLE IF NOT EXISTS conversations (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    -- user | assistant
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    -- JSON array of citation objects, assistant messages only
    citations       TEXT,
    refused         INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- One row per user; the row with user_id = '__system__' is the default that
-- applies to visitors and to any user who has not customised theirs.
CREATE TABLE IF NOT EXISTS generation_settings (
    user_id         TEXT PRIMARY KEY,
    temperature     REAL,
    top_p           REAL,
    top_k           INTEGER,
    max_tokens      INTEGER,
    repeat_penalty  REAL,
    model           TEXT,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_prompts (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    body        TEXT NOT NULL,
    author_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
    -- draft (author-only) | published (selectable) | default (system default)
    status      TEXT NOT NULL DEFAULT 'draft',
    notes       TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON system_prompts(status);

-- Reviewer credentials. Deliberately all-nullable: this is a pilot, and a
-- clinician must be able to start reviewing before their paperwork is on file.
-- A missing credential is RECORDED AS MISSING, never silently omitted.
CREATE TABLE IF NOT EXISTS reviewer_profiles (
    user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    credential    TEXT,
    license_state TEXT,
    npi           TEXT,
    -- JSON. Lets us add fields during the pilot without a migration.
    extra         TEXT,
    updated_at    TEXT NOT NULL
);

-- Clinical review records. APPEND-ONLY: nothing here is ever UPDATEd or
-- DELETEd. A correction is a new row, so the audit trail skeleton §21 requires
-- cannot be rewritten.
CREATE TABLE IF NOT EXISTS content_reviews (
    id              TEXT PRIMARY KEY,
    block_id        TEXT NOT NULL,
    -- sha256 of the exact text reviewed. If the content later changes, the
    -- hash stops matching and the block returns to "needs re-review" instead
    -- of silently carrying the old attestation onto new text.
    content_hash    TEXT NOT NULL,
    content_version TEXT NOT NULL,

    reviewer_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
    -- Snapshots, not joins: a renamed or deactivated account must not rewrite
    -- who attested to what, and when.
    reviewer_name   TEXT NOT NULL,
    credential      TEXT,
    license_state   TEXT,

    -- 'clinical' = authoritative, recorded by a clinician.
    -- 'qa'       = internal validation by an admin. NEVER counts as a review.
    authority       TEXT NOT NULL,
    -- approved | approved_with_changes | rejected | needs_info
    decision        TEXT NOT NULL,
    comments        TEXT,
    effective_date  TEXT,
    next_review_date TEXT,
    extra           TEXT,
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_block ON content_reviews(block_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_authority ON content_reviews(authority);

CREATE TABLE IF NOT EXISTS documents (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    filename      TEXT,
    uploader_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
    -- always 'uploaded' for this table; approved content is not stored here
    provenance    TEXT NOT NULL DEFAULT 'uploaded',
    notes         TEXT,
    chunk_count   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id          TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    ordinal     INTEGER NOT NULL,
    text        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id, ordinal);

-- Site feedback from the header "Feedback" survey. Deliberately NOT tied to
-- sessions: a visitor's session is swept after inactivity, and their feedback
-- must outlive it. Nothing identifies a visitor unless they leave an email.
CREATE TABLE IF NOT EXISTS feedback (
    id              TEXT PRIMARY KEY,
    created_at      TEXT NOT NULL,
    -- the route the survey was opened from, e.g. /toolkit/uds
    page            TEXT,
    content_version TEXT,
    user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_role       TEXT NOT NULL,
    -- JSON object of 1-5 scores keyed by question id
    ratings         TEXT NOT NULL,
    -- JSON object of the multiple-choice and free-text answers
    answers         TEXT NOT NULL,
    contact_email   TEXT,
    user_agent      TEXT,
    viewport        TEXT
);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
"""


def _connect(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(path), check_same_thread=False, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=15000")
    return conn


def init(path: Path) -> None:
    """Create the database and schema. Safe to call on every worker start."""
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = _connect(path)
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()
    _local.path = path


_db_path: Path | None = None


def configure(path: Path) -> None:
    global _db_path
    _db_path = path
    init(path)


def _conn() -> sqlite3.Connection:
    """One connection per thread. sqlite3 objects are not thread-safe."""
    if _db_path is None:
        raise RuntimeError("db.configure() has not been called")
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = _connect(_db_path)
        _local.conn = conn
    return conn


@contextmanager
def cursor() -> Iterator[sqlite3.Cursor]:
    """Transactional cursor: commits on success, rolls back on error."""
    conn = _conn()
    cur = conn.cursor()
    try:
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()


def query(sql: str, params: tuple = ()) -> list[sqlite3.Row]:
    with cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def query_one(sql: str, params: tuple = ()) -> sqlite3.Row | None:
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: tuple = ()) -> None:
    with cursor() as cur:
        cur.execute(sql, params)
