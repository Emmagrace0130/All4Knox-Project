# All4Knox — Phased Project Plan

**Purpose:** turn the toolkit from a working demo into (a) a clinically usable
pilot for the McNabb Center and (b) a defensible research contribution.

**Status legend:** ✅ done · 🟡 in progress · ⬜ not started · 🔒 blocked

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
| 1.5 | `LETSENCRYPT_EMAIL` set in `.env` | Gerald | ⬜ |
| 1.6 | `all4knox.rubyrecon.com` DNS + vhost | Emma | 🔒 needs registrar access |
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
| 2.1 | Name a clinical reviewer | A licensed TN prescriber with OUD experience |
| 2.2 | Review all 29 content blocks | Record reviewer, review date, effective date, next review date |
| 2.3 | Resolve the oxycodone wait-time ambiguity | Slide 4 (12 hrs) vs slide 5 (>24 hrs) — currently both are shown |
| 2.4 | Verify McNabb Center referral details | Address, phone, payer acceptance, services, MAT/detox availability |
| 2.5 | Verify Cherokee/River Valley, ReVida, Cedar Recovery | Same fields |
| 2.6 | Confirm current TN prescribing + TennCare/BESMART rules | Rules change; the summary is a snapshot |
| 2.7 | Add a review-workflow UI or process | So review is repeatable, not a one-off |
| 2.8 | Set a review cadence | Skeleton §20 requires a next-review date on every block |

**Exit criteria:** `GET /api/sources` reports `reviewedCount == 29`, every block
carries a named reviewer and a next-review date, and no field renders as
"not yet verified" without that being deliberate and true.

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

### Definition of done (any clinical change)

1. Content edited in `frontend/src/content/` — never in the generated JSON.
2. `npm run export:content` **and** `npm run export:parity` re-run.
3. Backend tests pass, parity included.
4. Frontend typechecks and builds.
5. `docs/session-handoff.md` updated if the shape of the project changed.
6. Reviewer + review date recorded if the change touches clinical guidance.
