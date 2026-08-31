# All4Knox — Phased Project Plan

**Purpose:** turn the toolkit from a working demo into (a) a clinically usable
pilot for the McNabb Center and (b) a defensible research contribution.

**Status legend:** ✅ done · 🟡 in progress · ⬜ not started · 🔒 blocked

**As of 2026-08-31:** Phase 0 and Phase 1 complete except items needing a
human; Phase 2.5 guided UX done and the review workflow built. Phase 2 is no
longer blocked on *finding* a clinician — Dr. Ryan Alexander is the clinical
contact — but on confirming who signs off and then doing the 29 reviews.

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
| 2.2 | Review all 29 content blocks | Record reviewer, review date, effective date, next review date |
| 2.3 | Resolve the oxycodone wait-time ambiguity | Slide 4 (12 hrs) vs slide 5 (>24 hrs) — currently both are shown |
| 2.4 | Verify McNabb Center referral details | Address, phone, payer acceptance, services, MAT/detox availability |
| 2.5 | Verify Cherokee/River Valley, ReVida, Cedar Recovery | Same fields |
| 2.6 | Confirm current TN prescribing + TennCare/BESMART rules | Rules change; the summary is a snapshot |
| 2.7 | ~~Add a review-workflow UI or process~~ | ✅ built 2026-08-31 — `/review`, see [`clinical-review-plan.md`](clinical-review-plan.md) |
| 2.8 | Set a review cadence | Skeleton §20 requires a next-review date on every block |

**Exit criteria:** `GET /api/sources` reports `reviewedCount == 29`, every block
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
| 2.5.6 | Rate limiting before any agent endpoint is public | ⬜ blocks 2.5.4 |

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
| 3.1 | COWS calculator | §13-B |
| 3.2 | OUD diagnosis helper (DSM checklist) | §13-A |
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
| 4.1 | Define the pilot cohort (how many providers, which sites) |
| 4.2 | IRB determination — human-subjects review for any provider data collection |
| 4.3 | Baseline measures before providers use the tool |
| 4.4 | Privacy-preserving usage analytics (no PHI — skeleton §22) |
| 4.5 | Structured provider feedback instrument |
| 4.6 | Training/onboarding materials |
| 4.7 | Support + escalation path during the pilot |

**Note on 4.2:** anything that collects data *from providers* for research
almost certainly needs IRB review. Start this early — it is the longest
lead-time item in the whole plan and it gates publication.

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
- **`docs/session-handoff.md` §8** is the session log — append a row per session.
- **Git history** is the detail. Write commit messages that explain *why*.
- **`GET /api/sources`** is the live clinical-content tracker: it reports the
  real review state of all 29 blocks and cannot drift from reality.

### Current blockers, in order

| # | Blocker | Owner | Unblocks |
| --- | --- | --- | --- |
| B1 | Commit + push the overnight work; merge `gj_dev` → `main` | Gerald/Emma | everything downstream |
| B2 | **Confirm the named clinical reviewer** — Dr. Ryan Alexander is the contact; settle whether he signs off or nominates | Gerald/Emma | all of Phase 2, the pilot, both field papers |
| B3 | Decide PHI-in-conversations policy (retention / encryption / refuse-to-store) | Gerald | the pilot |
| B5 | `LETSENCRYPT_EMAIL` in `.env` | Gerald | cert-expiry warnings reaching a human |
| B6 | Change the seeded admin password, blank `SEED_ADMIN_*` | Gerald | basic hygiene |

---

### Definition of done (any clinical change)

1. Content edited in `frontend/src/content/` — never in the generated JSON.
2. `npm run export:content` **and** `npm run export:parity` re-run.
3. Backend tests pass, parity included.
4. Frontend typechecks and builds.
5. `docs/session-handoff.md` updated if the shape of the project changed.
6. Reviewer + review date recorded if the change touches clinical guidance.
