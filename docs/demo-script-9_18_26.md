# Demo script — Dr. Alexander & McNabb team, 9/18/26

Target: ~15–20 minutes of demo, leaving most of the hour for the agenda
questions in
[`meeting_notes/mcnabb_meeting_9_18_26_agenda.md`](meeting_notes/mcnabb_meeting_9_18_26_agenda.md).
Live site: **https://all4knox.axiomsystemslab.com**

Slides to drive this script: [`demo-slides-9_18_26.md`](demo-slides-9_18_26.md)
(Marp-formatted — open with the Marp VS Code extension for a presentable
view, or read it as a plain outline).

## Before the meeting

- [ ] `./a4k warm` — warm the model so the first assistant answer isn't slow
- [ ] `./a4k health` — confirm API, assistant, index, public site all green
- [ ] `./a4k status` — confirm both containers healthy
- [ ] Have `docs/reference/` source PDFs open in another tab in case a
      citation needs to be shown at the source
- [ ] Know the one thing to say out loud unprompted: **nothing has been
      clinically reviewed yet** (0 of 30 blocks) — say this before he notices
      the banner himself

## 1. Orient (2 min)

Open `/` — mission, partners (McNabb Center, Applied Systems Lab — point out
the new logos), routing cards. This is what a patient-facing prescriber sees
first.

> "Everything below is unreviewed guidance transcribed from your Clinical
> Summary. That's why every page says so — we built the review workflow
> before we built anything else."

## 2. The four decision tools (5 min) — `/toolkit`

Pick 1–2 to actually click through, guided mode (`/toolkit/prescribing/guided`
is the best one for today because of the dose-limit changes):

- **Prescribing** (`/toolkit/prescribing`) — walk a TennCare / BESMART MD-DO
  patient through. Show the **32 mg** result, and the slide-2 figure shown
  beside it with the "these differ" note. This is agenda item 1 — the biggest
  ask today.
- **Dosing** (`/toolkit/dosing`) — same TennCare dose-limit change surfaces
  here too.
- Mention **Start Suboxone / UDS** exist and are unchanged since 9/1 if there's
  no time to click through them.

> "This is item 1 on the agenda — we followed your May BESMART update rather
> than the summary's slide 2 number. We need you to tell us if that's right."

## 3. Ask All4Knox — the new reference knowledge base (5–7 min) — `/ask`

This is the main development since 9/1. Explain, then show:

- The assistant now searches **three** sources, not one: the All4Knox
  toolkit content, the **TN Nonresidential Buprenorphine Treatment
  Guidelines**, and **TennCare BESMART** material.
- Each source that has relevant material gets its **own answer section** —
  the app will not credit one source's rule to another.
- The suggestion chips on the page now include two questions grounded in the
  new documents — click rather than type:
  - *"What is the maximum daily buprenorphine dose for BESMART MD or DO
    providers?"* — shows the toolkit section and the BESMART section
    answering separately, both citing page numbers.
  - *"What COWS score is recommended before an office-based buprenorphine
    induction?"* — shows it surfacing both the 7 and the 11 with their
    sources (agenda item 4). **Verified 2026-09-18: the toolkit and BESMART
    sections each come back saying, in one sentence, that they don't address
    COWS.** That's expected, not a bug — every source that clears the
    relevance floor gets its own section, and it's built to say plainly when
    it has nothing rather than guess. Say so if it comes up: *"Two of the
    three sections just told you they don't cover this — that's the honesty
    check working, not a malfunction. Only the state guideline section
    actually answers."*
- **Say the limitation out loud, don't wait to be asked:** *"Sectioning stops
  us crediting one source's rule to another. It doesn't stop the model
  misreading a passage within one source — in testing it once applied the
  16 mg NP/PA limit to a physician. Every answer lists the passages it used;
  that citation list is the check."*
- Optional, only if time: ask an off-corpus question (*"What's the warfarin
  dose for atrial fibrillation?"*) to show it refuses rather than
  guessing.

## 4. Clinical review workspace (2 min) — `/review`

Show the empty state — 0 of 30 reviewed. Explain the mechanics briefly: a
review binds to a hash of the reviewed text, so any content edit invalidates
prior sign-off. This is the natural bridge into agenda item 5 ("who signs
off the 30 blocks").

## 5. Hand off to the agenda

Everything past this point is the numbered agenda file — dose limits,
non-BESMART NP/PA, state thresholds, COWS, oxycodone wait time, referral
contacts, clinical sign-off, and the documents ask (updated BESMART Program
Description, PA forms).

## If something breaks

- Assistant slow/cold: mention it's warming up, move to the toolkit tools
  first and come back.
- Assistant errors: fall back to a screenshot or describe the behavior — do
  not debug live.
- Anything clinical looks wrong on screen: say so plainly, note it, do not
  argue the point live — it goes on the agenda for next time.
