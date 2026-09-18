"""
Accounts, sessions and roles.

Design notes:

* **Visitors are first-class.** Every request gets a session, signed in or not.
  A visitor session holds an assistant conversation so a provider can close the
  tab, come back, and continue — without an account and without leaving
  anything behind permanently.
* **Visitor data is swept.** After `VISITOR_SESSION_TTL_MINUTES` of inactivity
  the session and everything hanging off it (conversations, messages) is
  DELETED via ON DELETE CASCADE.
* **Passwords use PBKDF2-HMAC-SHA256** from the standard library — no extra
  dependency, and appropriate for the handful of accounts this will hold.
  If this ever grows beyond a pilot, move to argon2.
* **Session tokens are opaque random values**, not JWTs. There is nothing to
  decode client-side, revocation is a DELETE, and no signing key can leak.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from app.core import db

Role = Literal["visitor", "basic", "clinician", "admin"]

# Ordered. A dependency requiring "clinician" also admits "admin".
ROLE_ORDER: dict[str, int] = {"visitor": 0, "basic": 1, "clinician": 2, "admin": 3}

SYSTEM_SETTINGS_ID = "__system__"

PBKDF2_ROUNDS = 240_000


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return uuid.uuid4().hex


# --------------------------------------------------------------------------
# Passwords
# --------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${PBKDF2_ROUNDS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, rounds, salt_hex, digest_hex = stored.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        computed = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds)
        )
        # Constant-time: a timing side-channel here would leak the hash.
        return hmac.compare_digest(computed.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


# --------------------------------------------------------------------------
# Users
# --------------------------------------------------------------------------
def create_user(
    email: str, display_name: str, password: str, role: Role = "basic"
) -> dict[str, Any]:
    if role not in ("basic", "clinician", "admin"):
        raise ValueError(f"cannot create a user with role {role!r}")
    if len(password) < 10:
        raise ValueError("password must be at least 10 characters")
    email = email.strip().lower()
    if db.query_one("SELECT id FROM users WHERE email = ?", (email,)):
        raise ValueError("an account with that email already exists")

    user_id = _new_id()
    db.execute(
        "INSERT INTO users (id, email, display_name, password_hash, role, created_at) "
        "VALUES (?,?,?,?,?,?)",
        (user_id, email, display_name.strip(), hash_password(password), role, now()),
    )
    return get_user(user_id)  # type: ignore[return-value]


def get_user(user_id: str) -> dict[str, Any] | None:
    row = db.query_one("SELECT * FROM users WHERE id = ?", (user_id,))
    return public_user(row) if row else None


def authenticate(email: str, password: str) -> dict[str, Any] | None:
    row = db.query_one("SELECT * FROM users WHERE email = ?", (email.strip().lower(),))
    if row is None or not row["is_active"]:
        # Hash anyway so a missing account and a wrong password take the same
        # time — otherwise the response time enumerates valid emails.
        hash_password(password)
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    db.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now(), row["id"]))
    return public_user(row)


def public_user(row: Any) -> dict[str, Any]:
    """Never let password_hash escape this module."""
    return {
        "id": row["id"],
        "email": row["email"],
        "displayName": row["display_name"],
        "role": row["role"],
        "createdAt": row["created_at"],
        "lastLoginAt": row["last_login_at"],
        "isActive": bool(row["is_active"]),
    }


def list_users() -> list[dict[str, Any]]:
    return [public_user(r) for r in db.query("SELECT * FROM users ORDER BY created_at")]


def set_role(user_id: str, role: Role) -> None:
    if role not in ("basic", "clinician", "admin"):
        raise ValueError(f"invalid role {role!r}")
    db.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))


def set_password(user_id: str, password: str) -> None:
    if len(password) < 10:
        raise ValueError("password must be at least 10 characters")
    db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (hash_password(password), user_id),
    )


def set_active(user_id: str, active: bool) -> None:
    db.execute("UPDATE users SET is_active = ? WHERE id = ?", (1 if active else 0, user_id))
    if not active:
        # Revoke live sessions immediately rather than waiting for TTL.
        db.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))


# --------------------------------------------------------------------------
# Sessions
# --------------------------------------------------------------------------
def create_session(user_id: str | None = None, user_agent: str | None = None) -> str:
    session_id = secrets.token_urlsafe(32)
    stamp = now()
    db.execute(
        "INSERT INTO sessions (id, user_id, created_at, last_seen_at, user_agent) "
        "VALUES (?,?,?,?,?)",
        (session_id, user_id, stamp, stamp, (user_agent or "")[:300]),
    )
    return session_id


def touch_session(session_id: str) -> None:
    db.execute("UPDATE sessions SET last_seen_at = ? WHERE id = ?", (now(), session_id))


def get_session(session_id: str) -> dict[str, Any] | None:
    row = db.query_one("SELECT * FROM sessions WHERE id = ?", (session_id,))
    if row is None:
        return None
    user = get_user(row["user_id"]) if row["user_id"] else None
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "user": user,
        "role": (user or {}).get("role", "visitor"),
        "createdAt": row["created_at"],
        "lastSeenAt": row["last_seen_at"],
    }


def attach_user(session_id: str, user_id: str) -> None:
    """
    Sign in on the CURRENT session rather than issuing a new one, so a visitor
    who was mid-conversation keeps it when they sign in.
    """
    db.execute("UPDATE sessions SET user_id = ? WHERE id = ?", (user_id, session_id))
    db.execute(
        "UPDATE conversations SET user_id = ? WHERE session_id = ?",
        (user_id, session_id),
    )


def end_session(session_id: str) -> None:
    db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))


def sweep_expired(visitor_ttl_minutes: int, account_ttl_days: int = 30) -> dict[str, int]:
    """
    Delete stale sessions. Conversations and messages go with them via
    ON DELETE CASCADE, which is the point: a visitor leaves nothing behind.
    """
    visitor_cutoff = (
        datetime.now(timezone.utc) - timedelta(minutes=visitor_ttl_minutes)
    ).isoformat()
    account_cutoff = (
        datetime.now(timezone.utc) - timedelta(days=account_ttl_days)
    ).isoformat()

    with db.cursor() as cur:
        cur.execute(
            "DELETE FROM sessions WHERE user_id IS NULL AND last_seen_at < ?",
            (visitor_cutoff,),
        )
        visitors = cur.rowcount
        cur.execute(
            "DELETE FROM sessions WHERE user_id IS NOT NULL AND last_seen_at < ?",
            (account_cutoff,),
        )
        accounts = cur.rowcount
    return {"visitorSessions": visitors, "accountSessions": accounts}


def has_role(actual: str, required: str) -> bool:
    return ROLE_ORDER.get(actual, -1) >= ROLE_ORDER.get(required, 99)


def ensure_seed_admin(email: str, password: str, display_name: str = "Administrator") -> str | None:
    """
    Create the first admin if there are no accounts at all.

    Deliberately a no-op once any user exists — this must never silently reset
    or re-create an admin on a running system.

    The check-then-insert is NOT atomic across processes, and the API runs
    several uvicorn workers that all start at once. Whichever worker loses the
    race hits the UNIQUE constraint on users.email; that is the expected
    outcome for a loser, not an error, so it is swallowed. Without this, a
    fresh deployment kills a worker on every cold start.
    """
    if not email or not password:
        return None
    if db.query_one("SELECT id FROM users LIMIT 1"):
        return None
    try:
        user = create_user(email, display_name, password, role="admin")
    except (sqlite3.IntegrityError, ValueError):
        # Another worker seeded it microseconds earlier. Fine.
        return None
    return user["id"]
