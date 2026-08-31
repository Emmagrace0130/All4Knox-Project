"""
Request/response models.

These mirror `frontend/src/types/clinical.ts`. Responses are emitted in
camelCase so the existing React components consume API payloads without any
field renaming — the frontend's local content and the API's content are the
same shape by construction.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Coverage = Literal["private", "tenncare", "uninsured"]
PrescriberType = Literal["md_do", "np_pa"]
BesmartStatus = Literal["enrolled", "not_enrolled"]

UDSAnalyteKey = Literal["bup", "fent", "opi", "oxy", "mtd", "met", "coc", "other"]

STIMULANT_KEYS: tuple[str, ...] = ("met", "coc")
OTHER_OPIOID_KEYS: tuple[str, ...] = ("opi", "oxy", "mtd")
ALL_ANALYTES: tuple[str, ...] = (
    "bup",
    "fent",
    "opi",
    "oxy",
    "mtd",
    "met",
    "coc",
    "other",
)


class ApiModel(BaseModel):
    """Base model that passes camelCase through untouched."""

    model_config = ConfigDict(populate_by_name=True)


# --------------------------------------------------------------------------
# UDS
# --------------------------------------------------------------------------
class UDSPanel(ApiModel):
    """`true` = analyte detected on the screen."""

    bup: bool = False
    fent: bool = False
    opi: bool = False
    oxy: bool = False
    mtd: bool = False
    met: bool = False
    coc: bool = False
    other: bool = False


class UDSResult(ApiModel):
    panel: UDSPanel
    # Rules are returned verbatim from the content export, so they are passed
    # through as dicts rather than re-modelled field by field.
    primary: dict[str, Any] | None
    additional: list[dict[str, Any]] = Field(default_factory=list)
    unaddressed: list[str] = Field(default_factory=list)
    contentVersion: str
    sourceDocument: str


# --------------------------------------------------------------------------
# Prescribing
# --------------------------------------------------------------------------
class PrescribingInput(ApiModel):
    coverage: Coverage | None = None
    prescriber: PrescriberType | None = None
    besmart: BesmartStatus | None = None


class PrescribingResult(ApiModel):
    input: PrescribingInput
    pathway: dict[str, Any] | None
    complete: bool
    needsBesmart: bool
    contentVersion: str
    sourceDocument: str


# --------------------------------------------------------------------------
# Induction
# --------------------------------------------------------------------------
class InductionInput(ApiModel):
    situation: str | None = None
    answers: dict[str, str] = Field(default_factory=dict)


class InductionResult(ApiModel):
    input: InductionInput
    pathway: dict[str, Any] | None
    outcome: dict[str, Any] | None
    # Follow-up questions still unanswered for the selected pathway.
    pendingFollowUps: list[dict[str, Any]] = Field(default_factory=list)
    complete: bool
    contentVersion: str
    sourceDocument: str


# --------------------------------------------------------------------------
# Dosing
# --------------------------------------------------------------------------
class DosingInput(ApiModel):
    cravings: bool | None = None


class DosingResult(ApiModel):
    input: DosingInput
    overview: dict[str, Any]
    limits: dict[str, Any]
    guidance: dict[str, Any] | None
    contentVersion: str
    sourceDocument: str


# --------------------------------------------------------------------------
# Meta
# --------------------------------------------------------------------------
class HealthResult(ApiModel):
    status: str
    appEnv: str
    contentVersion: str
    bundles: dict[str, int]
    assistantEnabled: bool
