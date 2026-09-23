"""
All4Knox Clinical Provider Toolkit — FastAPI application.

Serves the reviewed clinical content and the deterministic decision tools
(skeleton §16–§18), plus the optional retrieval-grounded "Ask All4Knox"
assistant (§23).

Boot order matters: content bundles are verified first so a bad or missing
content export fails immediately and visibly, rather than surfacing as a 500 on
a clinician's first request. Index building happens in the background so a slow
or unreachable Ollama never delays the deterministic tools coming up.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    assistant_routes,
    auth_routes,
    clinical,
    content_routes,
    feedback_routes,
    review_routes,
    settings_routes,
)
from app.core import db
from app.core.config import get_settings
from app.models.clinical import HealthResult
from app.rag.assistant import Assistant
from app.services import auth, content

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)-8s %(name)s: %(message)s"
)
log = logging.getLogger("all4knox")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    # Persistence first: accounts, sessions and conversations all depend on it.
    db.configure(settings.database_path)
    log.info("database ready at %s", settings.database_path)

    try:
        seeded = auth.ensure_seed_admin(
            settings.seed_admin_email, settings.seed_admin_password
        )
    except Exception as exc:  # noqa: BLE001 - seeding must never block boot
        log.warning("seed admin creation skipped: %s", exc)
        seeded = None
    if seeded:
        log.warning(
            "seeded the first admin account (%s) — remove SEED_ADMIN_* from .env "
            "and change the password after first sign-in",
            settings.seed_admin_email,
        )

    bundles = content.verify_all()
    log.info(
        "clinical content v%s loaded: %d bundles, %d registry entries",
        content.content_version(),
        len(bundles),
        len(content.load("registry")["entries"]),
    )

    app.state.assistant = None
    if settings.assistant_enabled:
        assistant = Assistant(settings)
        app.state.assistant = assistant

        async def warm_index() -> None:
            try:
                stats = await assistant.ensure_index()
                log.info("assistant index ready: %s", stats)
            except Exception as exc:  # noqa: BLE001 - must never block startup
                assistant.last_error = str(exc)
                log.warning("assistant index unavailable: %s", exc)

        if settings.rag_auto_ingest:
            # Fire and forget: the deterministic tools must serve immediately.
            asyncio.create_task(warm_index())
    else:
        log.info("assistant disabled by configuration")

    async def sweep_sessions() -> None:
        """
        Periodically delete inactive visitor sessions and their conversations.

        A lazy sweep on request alone would leave a quiet server holding
        visitor data indefinitely, which is exactly what "wiped after
        inactivity" is supposed to prevent.
        """
        while True:
            try:
                await asyncio.sleep(600)
                removed = auth.sweep_expired(
                    settings.visitor_session_ttl_minutes,
                    settings.account_session_ttl_days,
                )
                if removed["visitorSessions"] or removed["accountSessions"]:
                    log.info("session sweep removed %s", removed)
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001 - a sweep failure must not kill the app
                log.warning("session sweep failed: %s", exc)

    sweeper = asyncio.create_task(sweep_sessions())

    yield

    sweeper.cancel()


app = FastAPI(
    title="All4Knox Clinical Provider Toolkit API",
    description=(
        "Tennessee-specific buprenorphine-naloxone clinical decision support. "
        "Clinical decision support only — not a substitute for clinician "
        "judgment, and not for emergency use."
    ),
    version=content.content_version(),
    lifespan=lifespan,
)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list,
    # Session cookies must travel on cross-origin dev requests
    # (npm run dev on :5173 against the containerised API).
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clinical.router, prefix="/api")
app.include_router(content_routes.router, prefix="/api")
app.include_router(assistant_routes.router, prefix="/api")
app.include_router(auth_routes.router, prefix="/api")
app.include_router(settings_routes.router, prefix="/api")
app.include_router(review_routes.router, prefix="/api")
app.include_router(feedback_routes.router, prefix="/api")


@app.get("/api/health", response_model=HealthResult, tags=["meta"])
def health() -> HealthResult:
    settings = get_settings()
    return HealthResult(
        status="ok",
        appEnv=settings.app_env,
        contentVersion=content.content_version(),
        bundles=content.verify_all(),
        assistantEnabled=settings.assistant_enabled,
    )
