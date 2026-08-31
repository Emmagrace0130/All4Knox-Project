"""
Loads the clinical content bundles exported from `frontend/src/content`.

The JSON under `app/data/content/` is generated, never hand-edited — see
`frontend/tools/exportContent.ts`. Loading it here (rather than re-declaring
the guidance in Python) is what keeps the API's clinical text identical to the
text a reviewer signed off on in the frontend modules.
"""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from app.core.config import CONTENT_DIR

# Bundle names must match the keys in frontend/tools/exportContent.ts.
BUNDLES = (
    "version",
    "governance",
    "prescribing",
    "induction",
    "uds",
    "dosing",
    "referrals",
    "learn",
    "resources",
    "toolkit",
    "registry",
)


@lru_cache
def load(bundle: str) -> dict[str, Any]:
    """Return one content bundle, with the generator's `_` metadata stripped."""
    if bundle not in BUNDLES:
        raise KeyError(f"unknown content bundle: {bundle}")
    path = CONTENT_DIR / f"{bundle}.json"
    if not path.exists():
        raise FileNotFoundError(
            f"{path} is missing. Regenerate it with: "
            "cd frontend && npm run export:content"
        )
    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)
    return {k: v for k, v in data.items() if not k.startswith("_")}


def content_version() -> str:
    return str(load("version")["contentVersion"])


def source_document() -> str:
    return str(load("version")["sourceDocument"])


def verify_all() -> dict[str, int]:
    """
    Load every bundle at startup so a missing or malformed export fails loudly
    on boot rather than on the first clinician request.
    """
    return {name: len(load(name)) for name in BUNDLES}
