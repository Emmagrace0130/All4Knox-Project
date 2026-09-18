"""
Request dependencies: session resolution and role gates.

Every request gets a session — visitors included. `require_role` returns a
dependency that admits the named role and anything above it.
"""

from __future__ import annotations

from typing import Any, Callable

from fastapi import Depends, HTTPException, Request, Response

from app.core.config import get_settings
from app.services import auth

SESSION_COOKIE = "all4knox_session"


def get_session(request: Request, response: Response) -> dict[str, Any]:
    """
    Resolve (or mint) this request's session.

    A cookie pointing at a swept session is treated as no cookie at all — the
    visitor simply gets a fresh one rather than an error.
    """
    settings = get_settings()
    token = request.cookies.get(SESSION_COOKIE)
    session = auth.get_session(token) if token else None

    if session is None:
        token = auth.create_session(
            user_id=None, user_agent=request.headers.get("user-agent")
        )
        session = auth.get_session(token)
        response.set_cookie(
            SESSION_COOKIE,
            token,
            httponly=True,
            samesite="lax",
            secure=settings.cookie_secure,
            max_age=settings.account_session_ttl_days * 86400,
            path="/",
        )
    else:
        auth.touch_session(session["id"])

    return session  # type: ignore[return-value]


def require_role(required: str) -> Callable[..., dict[str, Any]]:
    def dependency(session: dict[str, Any] = Depends(get_session)) -> dict[str, Any]:
        if not auth.has_role(session.get("role", "visitor"), required):
            raise HTTPException(
                403,
                f"this action requires the {required} role; "
                f"you are signed in as {session.get('role', 'visitor')}",
            )
        return session

    return dependency


require_basic = require_role("basic")
require_clinician = require_role("clinician")
require_admin = require_role("admin")
