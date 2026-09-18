"""Session, account and role endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import SESSION_COOKIE, get_session, require_admin
from app.core.config import get_settings
from app.services import auth, conversations

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class CreateUserRequest(BaseModel):
    email: EmailStr
    displayName: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=10, max_length=200)
    role: str = "basic"


class RoleRequest(BaseModel):
    role: str


class PasswordRequest(BaseModel):
    password: str = Field(min_length=10, max_length=200)


@router.get("/auth/me", tags=["auth"])
def me(session: dict[str, Any] = Depends(get_session)) -> dict[str, Any]:
    """
    Who am I? Always succeeds — an anonymous caller is a visitor, not an error.
    """
    return {
        "sessionId": session["id"][:8] + "…",
        "role": session.get("role", "visitor"),
        "user": session.get("user"),
        "isAuthenticated": session.get("user") is not None,
    }


@router.post("/auth/login", tags=["auth"])
def login(
    payload: LoginRequest,
    session: dict[str, Any] = Depends(get_session),
) -> dict[str, Any]:
    user = auth.authenticate(payload.email, payload.password)
    if user is None:
        # Deliberately vague: distinguishing "no such account" from "wrong
        # password" hands an attacker an account enumeration oracle.
        raise HTTPException(401, "invalid email or password")

    # Sign in on the CURRENT session so a visitor mid-conversation keeps it.
    auth.attach_user(session["id"], user["id"])
    return {"user": user, "role": user["role"], "isAuthenticated": True}


@router.post("/auth/logout", tags=["auth"])
def logout(
    response: Response, session: dict[str, Any] = Depends(get_session)
) -> dict[str, Any]:
    auth.end_session(session["id"])
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.post("/auth/reset-session", tags=["auth"])
def reset_session(
    response: Response, session: dict[str, Any] = Depends(get_session)
) -> dict[str, Any]:
    """
    Wipe this session's conversations without signing out. The visible
    equivalent of the automatic inactivity sweep.
    """
    conversations.clear_session(session["id"])
    return {"ok": True, "cleared": True}


# --------------------------------------------------------------------------
# Admin: user management
# --------------------------------------------------------------------------
@router.get("/admin/users", tags=["admin"])
def list_users(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"users": auth.list_users()}


@router.post("/admin/users", tags=["admin"])
def create_user(
    payload: CreateUserRequest, _: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    try:
        return {"user": auth.create_user(
            payload.email, payload.displayName, payload.password, payload.role  # type: ignore[arg-type]
        )}
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.put("/admin/users/{user_id}/role", tags=["admin"])
def set_role(
    user_id: str, payload: RoleRequest, session: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    if user_id == session["userId"] and payload.role != "admin":
        # Otherwise the last admin can lock everyone out of administration.
        raise HTTPException(400, "you cannot remove your own admin role")
    try:
        auth.set_role(user_id, payload.role)  # type: ignore[arg-type]
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"user": auth.get_user(user_id)}


@router.put("/admin/users/{user_id}/password", tags=["admin"])
def set_password(
    user_id: str, payload: PasswordRequest, _: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    try:
        auth.set_password(user_id, payload.password)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"ok": True}


@router.put("/admin/users/{user_id}/active", tags=["admin"])
def set_active(
    user_id: str, active: bool, session: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    if user_id == session["userId"] and not active:
        raise HTTPException(400, "you cannot deactivate your own account")
    auth.set_active(user_id, active)
    return {"user": auth.get_user(user_id)}


@router.post("/admin/sweep", tags=["admin"])
def sweep(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    """Run the inactivity sweep now rather than waiting for the periodic task."""
    settings = get_settings()
    return auth.sweep_expired(
        settings.visitor_session_ttl_minutes, settings.account_session_ttl_days
    )
