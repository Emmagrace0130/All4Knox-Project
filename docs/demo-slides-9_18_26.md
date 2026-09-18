---
marp: true
theme: default
paginate: true
---

<!--
Demo slides — Dr. Alexander & McNabb team, 2026-09-18.
Renders as-is in the Marp VS Code extension, or read it straight as an
outline. Pairs with docs/demo-script-9_18_26.md (click-through detail) and
docs/project-state-2026-09-18.md (one-page handout).
-->

# All4Knox
### Clinical Provider Toolkit — status check
Dr. Ryan Alexander & the McNabb Center team — 2026-09-18

---

## Today

1. What's live, in one line
2. What's new since 9/1
3. Demo: prescribing tool (dose-limit change)
4. Demo: Ask All4Knox (new sources)
5. What's still open — the agenda

<!--
Set expectations: most of the hour is the numbered agenda, this is ~15-20 min.
-->

---

## Where things stand

**Demo-ready. Not yet cleared for real patient use.**

- Four decision tools: prescribing, induction, UDS, dosing
- "Ask All4Knox" — grounded Q&A assistant, cites its sources
- Clinical review workspace at `/review`
- **0 of 30 content blocks reviewed** — said on every page, not hidden

---

## What's new since 9/1

| | |
|---|---|
| **Reference knowledge base** | Assistant now searches TN buprenorphine guidelines + TennCare BESMART material, not just the All4Knox toolkit |
| **Per-source answering** | Each matching source gets its own answer section — one source's rule can't be credited to another |
| **TennCare dose limits (v2026.2)** | Prescribing/dosing tools follow the May 2026 BESMART update (32 mg) instead of the Clinical Summary's slide 2 (20–24 mg) — **pending your confirmation** |
| **Branding** | All4Knox logo, McNabb + lab logos in the footer |

---

## Demo 1 — Prescribing tool

`/toolkit/prescribing` → TennCare, BESMART-enrolled MD/DO

- Result: **32 mg/day, no PA** for preferred products
- Old Clinical Summary figure (20–24 mg) shown alongside, flagged as differing
- Same change reflected in the dosing tool

**This is agenda item 1 — the biggest ask today.**

---

## Demo 2 — Ask All4Knox

`/ask`

Try live:
- *"What is the maximum daily buprenorphine dose for BESMART MD or DO providers?"*
- *"What COWS score is recommended before an office-based buprenorphine induction?"*
  — the toolkit and BESMART sections will say they don't cover it; that's the
  honesty check working, not a bug.

Watch for: **separate sections per source**, each with its own citations.

---

## The limitation, said out loud

Per-source sectioning stops the assistant crediting one source's rule to
another.

It does **not** stop it misreading a passage *within* one source — in
testing, one run applied the statute's 16 mg NP/PA limit to a physician.

**The citation list under every answer is the check.**

---

## What's still open — today's agenda

1. TennCare dose limits — Clinical Summary vs. May 2026 BESMART update
2. Can a non-BESMART NP/PA prescribe for a TennCare patient at all?
3. State documentation/consultation thresholds alongside the 32 mg limit
4. First-dose COWS threshold — 7 or 11?
5. Oxycodone wait time, referral contacts, who signs off the 30 blocks
6. Updated BESMART Program Description, PA forms, anything else to draw on

---

## Thank you

Full detail: `docs/meeting_notes/mcnabb_meeting_9_18_26_agenda.md`

Questions welcome throughout — we'll track decisions in
`mcnabb_meeting_9_18_26_notes.md` as we go.
