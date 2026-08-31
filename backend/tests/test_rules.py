"""Deterministic rule behaviour, including the documented ambiguities."""

import pytest

from app.models.clinical import ALL_ANALYTES
from app.services import content, rules


def panel(**kwargs) -> dict[str, bool]:
    base = {k: False for k in ALL_ANALYTES}
    base.update(kwargs)
    return base


# --- UDS ------------------------------------------------------------------
def test_bup_only_is_the_expected_result():
    result = rules.interpret_uds(panel(bup=True))
    assert result["primary"]["id"] == "uds_bup_only"
    assert result["unaddressed"] == []


def test_bup_with_fentanyl_matches_a_rule_and_addresses_both():
    result = rules.interpret_uds(panel(bup=True, fent=True))
    assert result["primary"] is not None
    addressed = set(result["primary"]["addresses"])
    for extra in result["additional"]:
        addressed |= set(extra["addresses"])
    assert "fent" in addressed


def test_empty_panel_returns_no_guidance_rather_than_inventing_it():
    result = rules.interpret_uds(panel())
    assert result["primary"] is None or result["primary"]["match"].get("bup") is False


def test_unmatched_positives_are_reported_not_silently_dropped():
    """A finding no rule speaks to must surface, so the UI can say so."""
    result = rules.interpret_uds(panel(bup=True, other=True))
    assert "other" in result["unaddressed"]


def test_superseded_rules_are_removed():
    rules_with_supersedes = [
        r for r in content.load("uds")["rules"] if r.get("supersedes")
    ]
    for rule in rules_with_supersedes:
        superseded_ids = set(rule["supersedes"])
        known = {r["id"] for r in content.load("uds")["rules"]}
        assert superseded_ids <= known, (
            f"{rule['id']} supersedes unknown rule(s) {superseded_ids - known}"
        )


# --- Prescribing ----------------------------------------------------------
def test_besmart_only_required_for_tenncare():
    assert rules.needs_besmart({"coverage": "tenncare"}) is True
    assert rules.needs_besmart({"coverage": "private"}) is False
    assert rules.needs_besmart({"coverage": "uninsured"}) is False


def test_tenncare_is_incomplete_without_besmart():
    data = {"coverage": "tenncare", "prescriber": "md_do", "besmart": None}
    assert rules.is_prescribing_complete(data) is False
    data["besmart"] = "enrolled"
    assert rules.is_prescribing_complete(data) is True


def test_private_is_complete_without_besmart():
    assert (
        rules.is_prescribing_complete(
            {"coverage": "private", "prescriber": "np_pa", "besmart": None}
        )
        is True
    )


@pytest.mark.parametrize("coverage", ["private", "tenncare", "uninsured"])
@pytest.mark.parametrize("prescriber", ["md_do", "np_pa"])
def test_every_complete_combination_resolves_to_a_pathway(coverage, prescriber):
    """No clinician should reach a dead end in the prescribing tool."""
    data = {
        "coverage": coverage,
        "prescriber": prescriber,
        "besmart": "enrolled" if coverage == "tenncare" else None,
    }
    assert rules.evaluate_prescribing(data) is not None, (
        f"no pathway for {coverage}/{prescriber}"
    )


def test_more_specific_pathway_wins():
    generic = rules.evaluate_prescribing({"coverage": "uninsured"})
    specific = rules.evaluate_prescribing(
        {"coverage": "tenncare", "prescriber": "md_do", "besmart": "enrolled"}
    )
    assert generic is not None and specific is not None
    assert len(specific["match"]) >= len(generic["match"])


# --- Induction ------------------------------------------------------------
def test_every_situation_has_a_pathway():
    for pathway in content.load("induction")["pathways"]:
        found = rules.find_induction_pathway(pathway["situation"])
        assert found is not None and found["id"] == pathway["id"]


def test_unknown_situation_returns_none():
    assert rules.find_induction_pathway("not_a_situation") is None
    assert rules.find_induction_pathway(None) is None


def test_answering_every_follow_up_yields_an_outcome():
    for pathway in content.load("induction")["pathways"]:
        answers = {
            f["id"]: f["options"][0]["value"] for f in pathway.get("followUps", [])
        }
        outcome = rules.select_induction_outcome(pathway, answers)
        assert outcome is not None, f"{pathway['id']} gave no outcome for {answers}"
        assert rules.pending_follow_ups(pathway, answers) == []


def test_pending_follow_ups_reported_before_completion():
    pathway = content.load("induction")["pathways"][0]
    if pathway.get("followUps"):
        assert rules.pending_follow_ups(pathway, {}) == pathway["followUps"]


# --- Dosing ---------------------------------------------------------------
def test_dosing_branches():
    assert rules.review_dosing(None) is None
    assert rules.review_dosing(True)["id"] != rules.review_dosing(False)["id"]
