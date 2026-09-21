# All4Knox — Phased Project Plan

**Purpose:** turn the toolkit from a working demo into (a) a clinically usable
pilot for the McNabb Center and (b) a defensible research contribution.

**Status legend:** ✅ done · 🟡 in progress · ⬜ not started · 🔒 blocked

**As of 2026-09-15:** Phase 0 and Phase 1 complete except items needing a
human; Phase 2.5 guided UX done, the review workflow built, and the assistant
now searches three collections (toolkit content, the Tennessee buprenorphine
guidelines, TennCare BESMART) with one answer section per source. Phase 2 is no
longer blocked on *finding* a clinician — Dr. Ryan Alexander is the clinical
contact — but on confirming who signs off and then doing the 30 reviews. The
9/1 McNabb meeting added a UX backlog (see "McNabb feedback, 9/1").

Milestones are **exit criteria**, not dates: a phase is done when its criteria
are demonstrably met, and each is written so you can check it rather than
argue about it.

---

## Phase 0 — Foundation ✅ *(complete 2026-08-31)*

Frontend skeleton, backend, containerisation, public deployment.

| # | Item | Status |
| --- | --- | --- |
| 0.1 | React + Vite + TS frontend, Phase-1 tools | ✅ |
| 0.2 | Clinical content extracted from the 2026 summary | ✅ |
| 0.3 | FastAPI backend serving all Phase-1 tools | ✅ |
| 0.4 | Content generated from a single source of truth | ✅ |
| 0.5 | TS↔Python parity harness (302 exhaustive cases) | ✅ |
| 0.6 | "Ask All4Knox" RAG assistant, measured refusal floor | ✅ |
| 0.7 | Docker Compose, both services healthy | ✅ |
| 0.8 | Public HTTPS + automatic renewal | ✅ |
| 0.9 | Handoff + rules-of-engagement docs | ✅ |

**Exit criteria — all met:** public URL serves over valid TLS; `/api/health`
returns `ok`; 29/29 tests pass; assistant answers grounded questions with
citations and refuses off-corpus ones.

---

## Phase 1 — Demo-ready 🟡 *(target: 2026-08-31, 11:30)*

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| 1.1 | Stack live on public HTTPS | Gerald | ✅ |
| 1.2 | Backend wired to all four decision tools | Gerald | ✅ |
| 1.3 | Assistant answering with citations | Gerald | ✅ |
| 1.4 | Pre-demo checklist incl. model warm-up | Gerald | ✅ |
| 1.8 | Ollama proxy credentials verified as a fallback | Gerald | ✅ |
| 1.9 | Merge `gj_dev` → `main` on GitHub | Emma/Gerald | 🟡 in progress |
| 1.10 | Guided "TurboTax" interview for all four tools | Gerald | ✅ verified by browser click-through |
| 1.11 | Accounts, roles, persistent assistant conversations | Gerald | ✅ |
| 1.12 | Markdown rendering of assistant answers | Gerald | ✅ |
| 1.13 | Landing page, sign-in, account pages | Gerald | ✅ |
| 1.14 | `./a4k` control CLI | Gerald | ✅ |
| 1.15 | Header nav clipping + toolkit card overlap | Gerald | ✅ verified at 6 widths |
| 1.16 | Commit and push the overnight work | Gerald | ✅ `3a0b4cc` on `gj_dev`, 7,235 lines |
| 1.5 | `LETSENCRYPT_EMAIL` set in `.env` | Gerald | ⬜ still blank as of 2026-08-31 |
| 1.6 | `all4knox.rubyrecon.com` DNS + vhost | Emma | ✅ 2026-08-31 — Emma added the A record; SAN cert issued, both hosts serve 200 |
| 1.7 | Walk the demo path end to end on a phone | both | ⬜ |

**Exit criteria:** a McNabb Center attendee can open the public URL on their own
device, complete a UDS interpretation and a prescribing lookup, and ask the
assistant a question — without anyone touching the server.

---

## Phase 2 — Clinical credibility ⬜ *(the gate to any real use)*

Nothing else matters until this is done. The toolkit is currently unreviewed,
and it says so honestly — but "honestly unreviewed" is not "usable".

| # | Item | Notes |
| --- | --- | --- |
| 2.0 | Review workflow built (`/review`) | ✅ 2026-08-31 — see [`clinical-review-plan.md`](clinical-review-plan.md) |
| 2.1 | Name a clinical reviewer | 🟡 Clinical contact established: **Dr. Ryan Alexander**, medical director of the McNabb Center site running this pilot, and the demo audience. Still to confirm: whether he is the named reviewer or nominates someone. **Nothing else in Phase 2 can start until that is settled.** |
| 2.1b | Create their clinician account and have them add credentials | One `POST /api/admin/users` + their sign-in. Currently curl-only — see 2.5.8; doing this in front of a clinician is a bad look, so the admin UI matters more than its phase number suggests. |
| 2.2 | Review all 30 content blocks | Record reviewer, review date, effective date, next review date |
| 2.3 | Resolve the oxycodone wait-time ambiguity | Slide 4 (12 hrs) vs slide 5 (>24 hrs) — currently both are shown |
| 2.4 | Verify McNabb Center referral details | Address, phone, payer acceptance, services, MAT/detox availability |
| 2.5 | Verify Cherokee/River Valley, ReVida, Cedar Recovery | Same fields |
| 2.6 | Confirm current TN prescribing + TennCare/BESMART rules | Rules change; the summary is a snapshot |
| 2.7 | ~~Add a review-workflow UI or process~~ | ✅ built 2026-08-31 — `/review`, see [`clinical-review-plan.md`](clinical-review-plan.md) |
| 2.8 | Set a review cadence | Skeleton §20 requires a next-review date on every block |

**Exit criteria:** `GET /api/sources` reports `reviewedCount == 30`, every block
carries a named reviewer and a next-review date, and no field renders as
"not yet verified" without that being deliberate and true.

---

## Phase 2.5 — Guided interview + agent assist 🟡

The McNabb Center described the experience they wanted as **TurboTax-like**.
The guided interview delivering that is built (see
[`frontend-guide.md`](frontend-guide.md) §9). The agent half is specified but
not built.

| # | Item | Status |
| --- | --- | --- |
| 2.5.1 | Guided interview for the four Phase-1 tools | ✅ |
| 2.5.2 | Guided variants for Phase 3 tools as they land | ⬜ |
| 2.5.3 | Decide whether guided becomes the default presentation | ⬜ needs McNabb feedback |
| 2.5.4 | Tool-calling agent that **pre-fills** the interview | ⬜ see below |
| 2.5.7 | Document upload with `uploaded` provenance tier | ⬜ schema exists, nothing writes to it |
| 2.5.8 | Admin UI for prompts / users / system defaults | ⬜ API complete, curl-only |
| 2.5.5 | Labelled eval set for agent argument extraction | ⬜ |
| 2.5.6 | Rate limiting before any agent endpoint is public | ⬜ blocks 2.5.4 — a nearly finished version is parked on `wip/agent-workstreams-2026-08-31`, with a broken test predicate documented in its commit message |
| 2.5.9 | Reference collections: TN guidelines (Fall 2023), BESMART description (Mar 2023), BESMART education (May 2026) — one search tool each, measured floors | ✅ 2026-09-15 |
| 2.5.10 | Per-source answer sections (one model call per source type) | ✅ 2026-09-15 — chosen after a single call misattributed thresholds between sources in 3/3 runs |
| 2.5.11 | A person checks the 8 AI transcriptions against the page images, then sets `checkedBy` | 🟡 Gerald checking (2026-09-15) — checklist in `docs/reference/transcription-check.md`; citations say "not yet checked" until then |
| 2.5.12 | Obtain TennCare's **updated** BESMART Program Description (the Mar 2023 copy is superseded in part) | ⬜ |
| 2.5.13 | Admin/clinician upload of new reference documents (meeting ask) — same pipeline as `./a4k reference` | ⬜ |
| 2.5.14 | Server-written section headings render as small labels; make source sections visually distinct | ⬜ |
| 2.5.15 | *(Detail, question IDs and workstreams for 2.5.15–2.5.17: `docs/reference-incorporation-plan.md`, W2/W3/W4/W5.)* Enrich the four existing guided interviews with approved checklist-derived clinical context and result actions; add questions only when an answer changes the deterministic pathway | ⬜ depends on clinical review of the new material |
| 2.5.16 | Add a separate guided MAT clinic-readiness interview using the Design → Build → Enable → Connect → Pilot → Scale roadmap | ⬜ separate from patient-care tools; content and compliance review required |
| 2.5.17 | Add a separate MAT implementation/readiness assistant collection; do not mix operational guidance into clinical or payer sections | ⬜ deduplicate formats and assign provenance first |

### The agent design, and why it depends on the interview

A spike on 2026-08-31 measured `gpt-oss:20b` mapping clinical prose onto
structured tool calls:

| Configuration | Result |
| --- | --- |
| Naive schemas, no validation | 3/6 correct arguments |
| + enum coercion layer + repair round | 7/8 |
| + described analyte fields | 6/6 on UDS extraction |

Combined: **13/14**. The failures were *format* errors (`"MD"` for `"md_do"`),
fixed by coercion — except one *semantic* failure: it silently dropped an
analyte from a UDS panel. A dropped analyte is clinically meaningful and the
clinician would never have seen it happen.

That failure defines the architecture:

> **The agent pre-fills the guided interview. It never runs a clinical engine
> unsupervised.**

Natural language → agent proposes structured answers → the interview shows them
as editable chips → clinician confirms or corrects → the deterministic engine
decides. The agent does language↔structure translation only; the clinical
decision stays with the rule engines exactly as it is today.

The confirmation step is not an extra safeguard bolted on — it is the interview
screen that already exists. The customer's requested UX and the agent's safety
requirement are the same screen.

Every callable tool is an existing pure, read-only function with a pydantic
model, so a confused agent has no side effect available to it. Estimated
effort: roughly half a day plus a real eval set. Latency roughly doubles (two
model calls), which is why 2.5.6 blocks it.

---

## Phase 3 — Toolkit completion ⬜

The Phase-2 tools from skeleton §13 and §24.

| # | Item | Skeleton ref |
| --- | --- | --- |
| 3.1 | COWS calculator — source now held: TN guidelines Appendix C (transcribed, unchecked) | §13-B |
| 3.2 | OUD diagnosis helper (DSM checklist) — source now held: TN guidelines Appendix B | §13-A |
| 3.3 | Precipitated withdrawal guide | §13-C |
| 3.4 | Naloxone quick guide | §13-D |
| 3.5 | Medication interaction / sedation check | §13-E |
| 3.6 | Follow-up visit checklist | §13-F |
| 3.7 | Printable patient handouts + clinical forms | §12 |
| 3.8 | Site-wide search | §24 Phase 2 |
| 3.9 | County-based referral matching | §13-G |

Each new tool must ship with: content in `frontend/src/content/`, a Python
engine port, **parity fixture coverage**, and tests. No exceptions — the parity
guarantee is only worth anything if it is total.

---

## Phase 4 — Pilot with the McNabb Center ⬜

| # | Item |
| --- | --- |
| 4.0 | **McNabb's internal hosting/compliance approval** — see [`compliance-readiness-plan.md`](compliance-readiness-plan.md) | raised 9/18; a separate gate from IRB and from clinical content review |
| 4.1 | Define the pilot cohort (how many providers, which sites) |
| 4.2 | IRB determination — human-subjects review for any provider data collection |
| 4.3 | Baseline measures before providers use the tool |
| 4.4 | Privacy-preserving usage analytics (no PHI — skeleton §22) |
| 4.5 | Structured provider feedback instrument — draft scope in [`compliance-readiness-plan.md`](compliance-readiness-plan.md) §4 |
| 4.6 | Training/onboarding materials |
| 4.7 | Support + escalation path during the pilot |

**Note on 4.0 and 4.2:** these are two different reviews with two different
owners (McNabb's internal team vs. an IRB) and neither substitutes for the
other — see [`compliance-readiness-plan.md`](compliance-readiness-plan.md) §1.
Anything that collects data *from providers* for research almost certainly
needs IRB review. Start both early — IRB in particular is a long-lead-time
item that gates publication.

**Exit criteria:** an approved protocol, a consented cohort, and instrumented
baseline + follow-up measures.

---

## Phase 5 — Hardening ⬜

Deferred deliberately: none of it matters if Phase 2 never happens.

| # | Item | Why deferred |
| --- | --- | --- |
| 5.1 | Authentication / provider accounts | Skeleton §22 — no PHI, no accounts needed yet |
| 5.2 | Persistent database (Postgres) | Content is small and file-backed; add when there is state worth keeping |
| 5.3 | Swap the vector store for Qdrant/pgvector | Only if the corpus outgrows an exact scan (~50k chunks; we have 31) |
| 5.4 | Automated backups | Nothing is currently irreplaceable |
| 5.5 | CI (tests + parity on every push) | High value, low cost — pull this forward if the team grows |
| 5.6 | Rate limiting on `/api/assistant/*` | Public endpoint that consumes shared GPU |
| 5.7 | PWA / offline mode | Skeleton §24 Phase 3 |
| 5.8 | Content administration panel | Skeleton §24 Phase 3 |

**5.6 is the one to watch.** The assistant endpoint is publicly reachable and
each call consumes GPU on a shared box. If the URL is shared beyond the demo
audience, add rate limiting first.

---

## Phase 6 — Research output ⬜

See [`research/publication-plan.md`](research/publication-plan.md) for the full
literature and publication strategy.

| # | Item |
| --- | --- |
| 6.1 | Literature review (ISE, public health, OR, AI agents) |
| 6.2 | Position the contribution against existing CDS/RAG work |
| 6.3 | Choose target venue and match the study design to it |
| 6.4 | Pre-register the evaluation if the venue expects it |
| 6.5 | Draft |
| 6.6 | Identify and pursue grant opportunities |

---

## Tracking

Lightweight, because two people do not need Jira.

- **This file** is the plan of record. Update the status column in the same
  commit as the work.
- **Each maintainer's own handoff** (`docs/<name>_sessions/session-handoff.md`) §8
  is their session log. Append a row there, never to the other maintainer's
  copy (see `CLAUDE.md`). The root `docs/session-handoff.md` is frozen at
  2026-09-15.
- **Git history** is the detail. Write commit messages that explain *why*.
- **`GET /api/sources`** is the live clinical-content tracker: it reports the
  real review state of all 30 blocks and cannot drift from reality.

### Current blockers, in order

| # | Blocker | Owner | Unblocks |
| --- | --- | --- | --- |
| B1 | Merge `gj_dev` → `main` by PR as work lands (#1 merged 9/18 and #2 on 9/21; `b8b97ec` and the 9/21 docs are pending) | Gerald/Emma | everything downstream |
| B8 | Clinical questions raised by the reference documents (below). The 9/18 meeting settled none; they are Q1–Q4 and Q9 of the 9/21 email (`docs/meeting_notes/mcnabb_email_9_21_26_open_questions.md`), alongside Q5–Q8 on the new MAT/BESMART documents | Dr. Alexander | confirming the 2026.2 dose limits; plan W2/W3 (`docs/reference-incorporation-plan.md`) |
| B9 | McNabb's external-hosting/compliance approval criteria — unknown until their team reports back; self-assessment ready in `docs/compliance-readiness-plan.md` | McNabb's internal team | Phase 4.0, the pilot |
| B2 | **Confirm the named clinical reviewer** — Dr. Ryan Alexander is the contact; settle whether he signs off or nominates | Gerald/Emma | all of Phase 2, the pilot, both field papers |
| B3 | Decide PHI-in-conversations policy (retention / encryption / refuse-to-store) | Gerald | the pilot |
| B5 | `LETSENCRYPT_EMAIL` in `.env` | Gerald | cert-expiry warnings reaching a human |
| B6 | Change the seeded admin password, blank `SEED_ADMIN_*` | Gerald | basic hygiene |

---

### Clinical questions raised by the reference documents (2026-09-15)

For Dr. Alexander, not a developer. Full framing in
`docs/meeting_notes/mcnabb_meeting_9_18_26_agenda.md`.

1. **Dose limits — DISCREPANCY, decision taken, confirmation pending.** The
   Clinical Summary (slide 2) gives BESMART MD/DO 20 mg (24 mg with addiction
   consultation) and PA-always/16 mg for non-BESMART; slide 11 says 20 mg for
   most physicians. TennCare's May 28, 2026 BESMART update gives BESMART MD/DO
   32 mg without PA (preferred products) and non-BESMART MD/DO 16 mg without
   PA, up to 32 mg with it. **Content version 2026.2 follows the May 2026
   update** for TennCare pathways (Gerald, 2026-09-15); each changed pathway
   shows the slide 2 figure and says the two differ. Private-insurance limits
   are unchanged. If Dr. Alexander disagrees, revert in
   `frontend/src/content/prescribing.ts` and bump the version.
2. **Non-BESMART NP/PA.** The BESMART update says "all mid-level prescribers
   must be BESMART"; slide 2 has a non-BESMART NP/PA pathway. Kept, marked as
   an open gap.
3. **State thresholds alongside the payer limit.** TN guidelines p. 19 / TCA
   § 53-11-311: document above 16 mg and consult above 20 mg for more than 30
   consecutive days. Shown as considerations on the changed pathways.
4. **First-dose COWS threshold.** The TN guidelines say both "give first dose
   when COWS ≥ 7" (Appendix C) and "COWS of 11 or higher is recommended" for
   office-based induction (Section II.D).

### McNabb feedback, 9/1 (backlog, not yet planned into phases)

From `docs/meeting_notes/mcnabb_meeting_9_1_26.md`:

- ✅ All4Knox logo in the header; lab and McNabb logos in a footer
  acknowledgements band (2026-09-15)
- ⬜ Interactive components easier to see; colour/domain grouping (e.g. Admin vs
  Clinician blocks on the home page)
- ⬜ In-app bugs / comments / suggestions channel the team can track
- ⬜ Usage analytics (tools used, return visits) — needs a PHI and consent decision first
- ⬜ Changelog / versions tab
- ⬜ Prior authorization forms and examples (Dr. Alexander to provide)
- ⬜ Admin/clinician tools to update the knowledge base (2.5.13)
- ⬜ Acronym and terminology hints (hover/tap indicators)
- ⬜ Survey tab on how well the app works

### Definition of done (any clinical change)

1. Content edited in `frontend/src/content/` — never in the generated JSON.
2. `npm run export:content` **and** `npm run export:parity` re-run.
3. Backend tests pass, parity included.
4. Frontend typechecks and builds.
5. Your own handoff (`docs/<name>_sessions/session-handoff.md`) updated if the
   shape of the project changed.
6. Reviewer + review date recorded if the change touches clinical guidance.
