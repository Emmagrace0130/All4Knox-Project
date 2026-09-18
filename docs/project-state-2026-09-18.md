# All4Knox — project state, 2026-09-18

One page for the McNabb Center meeting: what the app does today, what changed
since 9/1, and what's still open. For the full engineering detail see
[`session-handoff.md`](session-handoff.md); for phase-by-phase tracking see
[`project-plan.md`](project-plan.md).

## What All4Knox is

A clinical decision-support pilot for McNabb Center prescribers treating
opioid use disorder with buprenorphine: four deterministic decision tools
(prescribing eligibility, induction, UDS interpretation, dosing/cravings), a
grounded Q&A assistant ("Ask All4Knox"), and a clinical review workspace so a
named clinician can formally sign off the guidance before it's used on real
patients.

**Public site:** https://all4knox.axiomsystemslab.com

## Status in one line

Demo-ready; **not yet cleared for real patient use** — 0 of 30 clinical
content blocks have been reviewed by a clinician.

## What's new since the 9/1 meeting

| Area | What changed |
| --- | --- |
| **Reference knowledge base** | The assistant now searches two new sources beyond the All4Knox toolkit content: the *Tennessee Nonresidential Buprenorphine Treatment Guidelines* (Fall 2023) and *TennCare BESMART* material (Program Description Mar 2023, Provider Education May 28 2026). |
| **Per-source answering** | Each source that matches a question gets its own answer section, written from only that source's material — so the assistant can't attribute one source's rule to another. Testing found it would do this if given all sources at once. |
| **TennCare dose limits (content v2026.2)** | Prescribing/dosing tools now follow TennCare's May 2026 BESMART update (32 mg without PA for BESMART MD/DOs) rather than the Clinical Summary's slide 2 (20–24 mg). The old figure is shown alongside the new one with a note that they differ. **Pending Dr. Alexander's confirmation — this is the top agenda item today.** |
| **Branding** | All4Knox logo in the header; footer acknowledgements band with the Applied Systems Lab and McNabb Center logos; partner-card logos on the home page. |
| **Retrieval safety floor** | Each of the three sources has its own measured refusal threshold, re-measured after the new sources were added, so off-topic questions are refused rather than answered. |
| **Context-window budgeting** | The assistant's prompt is now sized to fit the model's context window server-side, so long conversations can't be silently truncated without notice. |

## Where in the app to see it

| Feature | Route |
| --- | --- |
| Landing page, partners, branding | `/` |
| Prescribing tool (dose-limit change) | `/toolkit/prescribing` (or `/guided`) |
| Dosing tool (dose-limit change) | `/toolkit/dosing` |
| Ask All4Knox (new sources, per-source sections) | `/ask` |
| Clinical review workspace (0 of 30) | `/review` |
| Source + version register | `/clinical-sources` |

## What still isn't done

- **Clinical review — 0 of 30 blocks.** Workflow exists at `/review`; no
  content is confirmed until a named clinician signs off. Dr. Alexander is
  the clinical contact; whether he reviews personally or names someone is
  still open.
- **Open clinical questions**, all on today's agenda: the TennCare dose-limit
  confirmation, whether a non-BESMART NP/PA can prescribe for TennCare
  patients at all, state documentation/consultation thresholds alongside the
  new payer limit, and which COWS threshold (7 vs 11) the toolkit should use.
- **Referral contact details** (McNabb, Cherokee/River Valley, ReVida, Cedar
  Recovery) are unverified — shown as such rather than guessed.
- **Phase 2 tools** (COWS calculator, OUD diagnosis helper, naloxone guide,
  follow-up checklist) are not built.
- **Admin/clinician self-service upload** of new reference documents doesn't
  exist yet — a developer runs `./a4k reference` by hand.
- 9/1 UX backlog (colour/domain grouping, feedback channel, changelog tab,
  acronym hints, usage analytics, survey) not yet started.
- **McNabb's internal external-hosting/compliance approval** — a separate
  gate from clinical review and IRB. Criteria unknown until their team
  reports back; see [`compliance-readiness-plan.md`](compliance-readiness-plan.md)
  for our self-assessment and the clinician pilot survey plan.

## Known limitation to say out loud in the demo

Per-source sectioning stops the assistant crediting one source's rule to
another, but it does not stop it misreading a passage within a single source
— in testing, one run applied the statute's 16 mg NP/PA limit to a physician.
Every answer lists the passages it used; that citation list is the check, not
the assistant's prose.
