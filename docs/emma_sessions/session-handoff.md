# Session Handoff — All4Knox Clinical Provider Toolkit

**Last updated:** 2026-09-15, end of session — logos, the assistant's reference
knowledge base, TennCare dose limits (content 2026.2). **Start at "Where we
paused" below.**

**Branch:** `gj_dev` — **13 commits ahead of `origin/gj_dev` and not pushed**. The GitHub repo is private (confirmed 2026-09-15), so the reference
PDFs and their extracted text are committed. `main` is still
at `36fa675`; the `gj_dev` → `main` merge is pending on GitHub and is Emma's
call. Unfinished rate limiting, admin UI and CI work is parked on
`wip/agent-workstreams-2026-08-31` — read its commit message before using any
of it. Always check `git log --oneline --all` and `git status` before assuming
which branch has what.
**Maintainers:** Emma (repo owner, `Emmagrace0130/All4Knox-Project`) · Gerald Jones
**Partner:** McNabb Center, Knoxville TN — this app is a pilot tool for them.

---

## Where we paused — 2026-09-15

**State.** Everything is committed on `gj_dev`; the working tree is clean; the
live site runs `HEAD` (API and web both rebuilt this session). Nothing pushed.
Live status at pause: containers healthy, `/api/sources` reports **0 of 30**
reviewed, assistant has 3 collections ready (toolkit 32, TN guidelines 70,
TennCare BESMART 34 passages), `RAG_REFERENCE_ENABLED=true`.

**Waiting on people**

| What | Who | Where |
| --- | --- | --- |
| Check the 8 AI transcriptions against their page images, then set `checkedBy` | Gerald — in progress | [`reference/transcription-check.md`](reference/transcription-check.md) |
| Meeting with Dr. Alexander, **Friday 2026-09-18** | Gerald + Emma | [`meeting_notes/mcnabb_meeting_9_18_26_agenda.md`](meeting_notes/mcnabb_meeting_9_18_26_agenda.md) |
| Confirm the TennCare dose limits (content 2026.2 follows the May 2026 BESMART update, not his slide 2) | Dr. Alexander, at that meeting | agenda item 1; revert path in project plan "Clinical questions" |
| Updated BESMART Program Description (ours is Mar 2023, superseded in part) | Dr. Alexander or TennCare | agenda item 6 |
| Push `gj_dev`; merge to `main` | Gerald / Emma | — |
| McNabb's internal external-hosting/compliance approval criteria | McNabb's team | [`compliance-readiness-plan.md`](compliance-readiness-plan.md) |

**Decisions made this session, and why**

- **One model call per source type** in Ask All4Knox. A single call over the
  toolkit, guideline and BESMART passages misattributed thresholds between
  sources in 3 of 3 live runs. Gerald chose the structural fix over ~1.5×
  latency (10–16 s when three sources answer). §3c, §6.
- **TennCare dose limits follow TennCare's May 28, 2026 BESMART update**
  (Gerald). Each changed pathway shows the slide 2 figure beside the new one
  and says they differ. Private-insurance limits unchanged. Pending Dr.
  Alexander's confirmation.
- **Repo is private** (Gerald), so the reference PDFs are committed.
- **Reference collections have an off switch**: `RAG_REFERENCE_ENABLED=false`
  in `.env`, then `docker compose up -d api`. It was used to hold the live site
  at toolkit-only while the sections design was built.

**Next development, in rough priority — none started**

1. Whatever Friday's meeting changes (dose limits, the non-BESMART NP/PA
   pathway, COWS threshold). Content edits go through §3a.
2. Make the server-written source section headings visually distinct in the
   answer (project plan 2.5.14). They currently render as small grey labels.
3. Admin/clinician upload of reference documents (2.5.13, also a 9/1 meeting
   ask). The pipeline to reuse is `./a4k reference`, and the `documents` table
   already exists.
4. The 9/1 meeting backlog in the project plan (feedback channel, changelog
   tab, acronym hints, survey, colour grouping, usage analytics).
5. Rate limiting from `wip/agent-workstreams-2026-08-31` (fix its test
   predicate first) — required before any tool-calling agent (2.5.4). The
   search tools already expose `schema()` for that agent.

**Loose ends noticed, not acted on**

- `generation_settings` has one user row with `temperature` 1.5 (the clamp
  maximum), probably from 2026-08-31 testing. If that account is used for a
  demo, its answers will be erratic — reset it at `/account`.
- `system_prompts` holds one draft variant, "Terse clinical". It is not
  published, so it has no effect.
- Test scripts left 3 empty conversations in throwaway visitor sessions; the
  2-hour inactivity sweep removes them (`./a4k sweep` to force).

---

## 0. Read this first: verify before you trust

**This document describes what was true when it was written. The repository is
the authority, not this file.** Before acting on anything below, confirm it
against the actual state of the repo and the running system. Documentation
drift is how two developers overwrite each other's work.

Run this before you change anything:

```bash
cd /home/gerald/GITS_REPOS/GIT_PLAY_GROUNDs/All4Knox-Project

git log --oneline -10   # what actually landed since this doc's date
git status              # uncommitted work in progress?
./a4k status            # is the stack up and healthy?
./a4k health            # API, assistant, index, public site
ls docs/                # have new docs appeared?

# how much clinical content has actually been reviewed
curl -s localhost:8410/api/sources | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d['reviewedCount'],'of',d['total'])"
```

**If what you find disagrees with this document, the repo wins.** Fix this
document as part of your change — do not leave the contradiction for the next
person. If you cannot tell which is right, ask the other maintainer rather than
guessing; a wrong guess here can mean re-doing or destroying finished work.

Specifically, before you build anything, check whether it already exists:

```bash
find backend/app -name '*.py' | sort      # what the API already does
ls frontend/src/pages/                    # what the UI already has
grep -rn "TODO\|FIXME" backend/app frontend/src --include='*.py' --include='*.ts*'
```

**Read [`rules-of-engagement.md`](rules-of-engagement.md) before running any
`docker` command.** This is a shared server with ~100 containers belonging to
other people.

**Working on the React app?** [`frontend-guide.md`](frontend-guide.md) is a full
walkthrough of its structure, patterns and conventions — §9 covers the guided
interview.

---

## 1. Where the project stands

### Live right now

| | |
| --- | --- |
| **Public URL** | <https://all4knox.axiomsystemslab.com> and <https://all4knox.rubyrecon.com> — one SAN cert covering both, expires 2026-11-29 |
| **API** | `https://all4knox.axiomsystemslab.com/api/...` — same origin, proxied by our nginx |
| **Local debug** | API `127.0.0.1:8410`, web `127.0.0.1:8411` |
| **Containers** | `all4knox-api`, `all4knox-web` — both healthy |
| **Assistant** | `gpt-oss:20b` via host Ollama; three collections — toolkit (32 passages), TN guidelines (70), TennCare BESMART (34); one answer section per source; ~3 s single-source, 10–16 s when all three answer |
| **Branch** | `gj_dev`, local commits not pushed. `main` at `36fa675` — merge pending |
| **Database** | SQLite at `/data/all4knox.db` on the `all4knox-data` volume |
| **First admin** | Seeded from `SEED_ADMIN_*` in `.env`. **Blank those out and change the password after first sign-in.** |
| **Clinical content** | Version **2026.2** — TennCare dose limits follow TennCare's May 2026 BESMART update, not slide 2; pending Dr. Alexander's confirmation |
| **Clinical review** | **0 of 30 blocks reviewed.** Workflow is built at `/review`. Clinical contact is Dr. Ryan Alexander (medical director, McNabb Center) — sign-off not yet started. |
| **Tests** | 82 backend tests passing · frontend build + lint clean |
| **Control** | `./a4k` — see `./a4k help` |

### Routes

| Route | What |
| --- | --- |
| `/` | Landing page — mission, partners, routing, toolkit cards |
| `/toolkit` | Toolkit dashboard |
| `/toolkit/{prescribing,start,uds,dosing}` | The four decision tools |
| `/toolkit/{...}/guided` | Guided "TurboTax" interview variants |
| `/ask` | Ask All4Knox assistant (persistent conversation) |
| `/review` | Clinical review workspace |
| `/clinical-sources` | Source + version register |
| `/sign-in`, `/account` | Optional accounts |
| `/learn/buprenorphine`, `/referrals`, `/resources`, `/about` | Reference |

### Ollama: two working paths, one active

`OLLAMA_BASE_URL` is `http://host.docker.internal:11434` — **direct to the host
daemon, no authentication**. That is the active path: fewer hops, no TLS
handshake, no dependency on the shared proxy.

`OLLAMA_USERNAME` / `OLLAMA_PASSWORD` are also set in `.env` and loaded into the
container, but **currently unused** — the direct path does not ask for them.
They are not dead weight: they are a *verified* fallback. Confirmed
2026-08-31 that `https://ollama.viridian.ise.utk.edu` returns 401 without them
and HTTP 200 with them (60 models visible).

To switch to the proxy path — needed only if the API ever moves off this host:

```bash
# .env
OLLAMA_BASE_URL=https://ollama.viridian.ise.utk.edu
docker compose up -d          # env is read at container start, not per request
```

### What works end to end

- All four Phase-1 decision tools (prescribing, induction, UDS, dosing) served
  by FastAPI, rendered by the existing React UI.
- **Accounts, roles and persistent assistant conversations** — visitors get a
  session-scoped conversation that survives tab switches and is wiped after
  inactivity; basic/clinician/admin accounts; per-user generation settings;
  admin-managed system prompts. See
  [`accounts-and-assistant-plan.md`](accounts-and-assistant-plan.md).
- **Markdown rendering** of assistant answers, via a renderer that structurally
  cannot emit raw HTML.
- **Landing page at `/`** — mission, partners (McNabb Center, Applied Systems
  Lab), routing by intent, and the toolkit cards. `/toolkit` is the dashboard.
- **Sign-in and account pages**, with a header account control.
- **Clinical review workspace** at `/review` — clinicians record authoritative
  sign-off, admins record internal QA that never counts. Reviews bind to a hash
  of the reviewed text, so editing content invalidates the approval. See
  [`clinical-review-plan.md`](clinical-review-plan.md).
- **`./a4k`** — one CLI for start/stop/rebuild/logs/health/tests, scoped to
  this project's containers.
- **Guided "TurboTax" interview** for all four tools at
  `/toolkit/<tool>/guided` — the presentation the McNabb Center asked for.
  Full-view pages are unchanged and reachable from every guided screen.
- Referral directory, resources, and the clinical sources/version register.
- "Ask All4Knox" retrieval assistant with streaming answers, citations and
  structural refusal.
- **Reference knowledge base** (2026-09-15). Besides the toolkit content, the
  assistant searches the *Tennessee Nonresidential Buprenorphine Treatment
  Guidelines* (Fall 2023) and TennCare BESMART material (Program Description,
  Mar 2023 — superseded in part; Provider Education, May 28 2026). The source
  PDFs are in `docs/reference/`; `./a4k reference` turns them into
  `backend/app/data/reference/passages/`. Each collection is its own search
  tool with its own measured floor (`backend/app/rag/tools.py`), and **each
  source type that matches is answered by its own model call** that sees only
  that source's passages — see §6. `RAG_REFERENCE_ENABLED=false` in `.env`
  turns the reference collections off without a rebuild.
- **Branding** — All4Knox logo in the header; footer acknowledgements band with
  the lab and McNabb Center logos; partner cards with logos on the home page.
- Full containerisation, public HTTPS, automatic TLS renewal.

### What is NOT done

- **No clinical review has happened — 0 of 30.** The workflow exists at
  `/review` and there is now a named clinical contact — **Dr. Ryan Alexander**,
  the medical director who heads the McNabb Center site running this pilot — but no block has been signed
  off yet. Until that happens the toolkit is not usable for real patient care.
  See §6.
- `LETSENCRYPT_EMAIL` in `.env` is blank; expiry warnings go nowhere.
- Phase 2 tools (COWS calculator, OUD diagnosis helper, naloxone guide,
  follow-up checklist) are not built. Sources for the COWS calculator and the
  DSM checklist are now held (TN guidelines appendices C and B).
- **The 8 AI transcriptions are unchecked** — see "Where we paused".
- **TennCare dose limits (2026.2) are not yet confirmed by Dr. Alexander.**
- No way to add reference documents except a developer running
  `./a4k reference`.
- Several clinical questions remain unresolved (§6 and the project plan).

---

## 2. Architecture

```text
Internet
  │
  ▼
nginx-proxy  (SHARED, :80/:443, already running — not ours)
  │   + nginx-proxy-acme  → Let's Encrypt certificates
  ▼
all4knox-web         nginx:alpine, viridian_network + all4knox-net
  ├── /              → built React/Vite SPA (static)
  └── /api/*         → proxy_pass http://api:8000
                        │
                        ▼
                      all4knox-api      FastAPI, all4knox-net ONLY
                        ├── deterministic rules  (no model, ever)
                        └── /api/assistant/*
                              ├── vector index (.npz on a named volume)
                              └── host Ollama :11434  (SHARED)
```

**Why the API is not its own hostname:** `api.all4knox.axiomsystemslab.com` does
not exist in DNS. Serving the API under `/api` on the same host means one DNS
record, one certificate, and no CORS preflight on any clinical request. The API
container is not on `viridian_network`, so it is unreachable from the internet
except through the paths our nginx proxies.

### Repository layout

```text
All4Knox-Project/
├── docker-compose.yml           # the whole stack
├── .env                         # SECRETS — gitignored, mode 600
├── .env.example                 # committed template, no real values
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + startup checks
│   │   ├── api/                 # clinical.py, content_routes.py, assistant_routes.py
│   │   ├── services/
│   │   │   ├── content.py       # loads the generated JSON
│   │   │   └── rules.py         # deterministic engines (ported from TS)
│   │   ├── rag/                 # assistant.py, tools.py (one search tool per collection),
│   │   │                        # corpus.py (toolkit), reference.py + chunking.py (reference docs),
│   │   │                        # store.py, ollama_client.py
│   │   ├── models/clinical.py   # pydantic request/response
│   │   ├── core/config.py       # settings from env
│   │   ├── data/content/*.json  # GENERATED — do not hand-edit
│   │   └── data/reference/      # manifest.json + transcriptions/ (hand) + passages/ (GENERATED)
│   ├── tests/                   # 82 tests incl. TS/Python parity
│   └── tools/                   # calibrate_threshold.py, extract_reference.py
├── frontend/
│   ├── src/content/             # ← SOURCE OF TRUTH for clinical text
│   ├── src/services/api.ts      # API client
│   ├── src/hooks/               # useBackendStatus, useVerifiedResult
│   ├── src/pages/AskAll4Knox.tsx
│   ├── tools/exportContent.ts   # content → backend JSON
│   ├── tools/parityFixtures.ts  # TS answers → parity fixture
│   └── nginx.conf               # SPA + /api proxy
└── docs/
    ├── session-handoff.md       # this file
    ├── rules-of-engagement.md   # READ BEFORE ANY docker COMMAND
    ├── reference/               # source PDFs the assistant searches + transcription-check.md
    ├── meeting_notes/           # McNabb meetings: 9/1 notes, 9/18 agenda
    ├── project-plan.md          # phases, milestones, tracking    ├── compliance-readiness-plan.md  # McNabb hosting approval, self-assessment, pilot survey plan    ├── source-extraction.md     # what came from which slide
    └── research/publication-plan.md
```

---

## 3. The two things most likely to trip you up

### 3a. Clinical content is generated — never hand-edit the backend JSON

`backend/app/data/content/*.json` is **generated** from
`frontend/src/content/*.ts`. That directory is the single source of truth.

The reason is safety, not tidiness. The clinical guidance was transcribed from
the All4Knox Clinical Summary 2026 once, by hand, and checked against the
slides. A second hand-typed copy in the backend could drift from the first, and
a drifted copy of clinical guidance is the worst defect this project can ship
(skeleton §21: *no silent rule changes*).

**To change any clinical text:**

```bash
# 1. edit frontend/src/content/<module>.ts
# 2. regenerate BOTH the backend content and the parity fixture
cd frontend
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/..":/work -w /work/frontend \
  -e npm_config_cache=/tmp/.npm node:22-alpine \
  sh -c "npm ci && npm run export:content && npm run export:parity"
# 3. re-run the backend tests
cd .. && docker run --rm -v "$PWD/backend":/app -w /app -e HOME=/tmp python:3.12-slim \
  sh -c "pip install -q pytest pydantic pydantic-settings email-validator httpx numpy \
        && python -m pytest tests/ -q"
# 4. rebuild
docker compose up -d --build
```

### 3b. The rule engines exist twice, and are held identical by tests

`frontend/src/services/*.ts` and `backend/app/services/rules.py` implement the
same clinical logic. The frontend keeps its copy so the toolkit still works when
the API is unreachable.

That fallback is only safe if the two agree **exactly** — otherwise a clinician
could see different guidance depending on whether the network was up, with no
indication which they got.

`backend/tests/test_parity.py` enforces this by replaying the **entire input
space** of every tool through the Python engines and comparing against what
TypeScript decided: all **256** UDS panels (2⁸ analytes), all **36** prescribing
combinations, all **10** induction combinations.

> If a parity test fails, **fix the divergence**. Do not regenerate the fixture
> to make it pass — that silently ratifies whichever implementation is wrong.

The UI surfaces this too: each tool computes locally for instant response, then
confirms against the API in the background and shows *"Confirmed by clinical
API"*, *"Offline — local clinical rules"*, or a loud red *"Result
disagreement"*.

---

## 3c. Traps found the hard way — do not reintroduce these

Every one of these was a live bug during the 2026-08-31 session. They are
listed together because each is invisible to a casual test.

| Trap | Symptom | Fix |
| --- | --- | --- |
| **Parallel session minting** | First assistant question returned 404 | Every endpoint mints a session when a request arrives without a cookie. On first load three calls fired in parallel with no cookie, each minting its own. React runs child effects *before* parent effects, so the page beat the provider. **Any new page that creates server-side state must wait for `identityLoading` to clear.** |
| **Seed-admin race** | A uvicorn worker died on every cold start | All workers saw an empty users table and raced to insert. Check-then-insert is not atomic across processes; the loser now swallows the integrity error. |
| **Editable safety prompt** | An admin could silently disable every guardrail | The system prompt is split: `SAFETY_PREAMBLE` is immutable and always prepended; only `STYLE_PROMPT` is editable. |
| **`justify-content: flex-end` on an overflow-scrolling flex container** | Nav items hidden behind the logo at *every* width; `scrollWidth` reported no overflow | Overflow goes off the **left** edge where scroll cannot reach. Use `width: max-content` + `margin-left: auto`. |
| **Missing grid-item rule** | Toolkit card content overlapped the row below | `.tool-card__link` had `height: 100%` with no `.tool-card` rule, so anything appended overflowed the cell. |
| **Retrieval floor set by feel** | Off-corpus questions reached the model | `RAG_MIN_SCORE` must be *measured*: `backend/tools/calibrate_threshold.py`. Re-measure after any embedding-model or corpus change. |
| **Testing against production** | A fabricated clinical attestation appeared live | An API test recorded a real-looking review signed by "Dr Test Reviewer". Deleted immediately. **If you test against the live system, clean up in the same breath.** |
| **One model call over several sources** | Dose thresholds attributed to the wrong source (3 of 3 runs) | With toolkit, guideline and BESMART passages in one prompt, `gpt-oss:20b` credited the toolkit's "24 mg with consult" to the state guideline, even with a preamble rule forbidding it. Each source type now gets its own call that sees only its own passages. **Do not merge the sections back into one call to save latency.** |
| **Silent context truncation** | Nothing visible — Ollama cuts the prompt | `gpt-oss:20b` runs with an 8192-token window on this host; an 18k-token prompt reported `prompt_eval_count=8191`. The server now budgets passages and history to fit (`fit_to_window`), caps the answer at half the window, and pins `num_ctx`. An answer that hits its length limit says so. |
| **`Secure` session cookie over plain HTTP** | Every scripted request 404s on its own conversation | The cookie is `Secure`, so a script talking to `http://127.0.0.1:8410` never sends it back and each call mints a new visitor session. Script against `https://all4knox.axiomsystemslab.com/api`. |
| **PDF tables and colour** | A dose rule attached to the wrong prescriber type | Text extraction scrambles slide tables, misses tables that are images, and loses red "update" text. Those pages are hand-transcribed in `data/reference/transcriptions/` and labelled "not yet checked by a person" until someone checks them. |

---

## 4. Common tasks

**Use `./a4k` for everything.** It is scoped to All4Knox containers so it
cannot touch a neighbour's work on this shared box. `./a4k help` lists it all.

```bash
cd /home/gerald/GITS_REPOS/GIT_PLAY_GROUNDs/All4Knox-Project

./a4k status      # containers, ports, public URL
./a4k rebuild     # after code changes
./a4k logs api    # follow logs
./a4k health      # API + assistant + index + public site
./a4k warm        # before a demo
./a4k check       # content + tests + build + lint

# the raw equivalents, if you prefer
docker compose ps
docker compose logs -f api
docker compose up -d --build

# run the test suite
docker run --rm -v "$PWD/backend":/app -w /app -e HOME=/tmp python:3.12-slim \
  sh -c "pip install -q pytest pydantic pydantic-settings email-validator httpx numpy \
        && python -m pytest tests/ -q"

# frontend typecheck + build
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD":/work -w /work/frontend \
  -e npm_config_cache=/tmp/.npm node:22-alpine sh -c "npm ci && npm run build"

# force every collection index to rebuild (after changing content or embedding model)
./a4k reindex

# re-extract the reference PDFs into passages — then READ THE DIFF
./a4k reference

# re-measure each collection's retrieval floor
./a4k calibrate
```

### Frontend dev server against the containerised API

```bash
cd frontend
VITE_API_BASE_URL=http://localhost:8410/api npm run dev
```

---

## 5. `all4knox.rubyrecon.com` — done 2026-08-31

Emma added the A record (`all4knox` → `160.36.100.65`, TTL 300) at the
`rubyrecon.com` registrar, overriding the wildcard `*.rubyrecon.com` that had
been sending the name to a Porkbun parking host.

`FRONTEND_VIRTUAL_HOST` now carries both names, comma-separated with no spaces,
and drives `VIRTUAL_HOST` and `LETSENCRYPT_HOST` alike:

```bash
# .env
FRONTEND_VIRTUAL_HOST=all4knox.axiomsystemslab.com,all4knox.rubyrecon.com
docker compose up -d          # recreates web only; acme-companion does the rest
```

acme-companion issued a single SAN certificate covering both names about 35
seconds later. Verified: both hostnames return 200 with `ssl_verify_result=0`,
`/api/health` answers through both, and the certificate's SAN list contains
exactly the two names. Expires 2026-11-29.

**If you ever add a third name**, the precondition is unchanged and is the whole
reason this took two attempts across two days: every name in `LETSENCRYPT_HOST`
must already resolve to `160.36.100.65` *before* the container starts. Check
with `getent hosts <name>` and, because a stale local resolver will lie to you,
against a public resolver too (`dig +short <name> @1.1.1.1`). Failed validations
count against a Let's Encrypt rate limit; if DNS is wrong, fix DNS rather than
retrying the certificate.

## 6. Clinical safety — the part that actually matters

**Nothing in this toolkit has been reviewed by a clinician.** All 30 content
blocks report `reviewedBy: null`, `reviewedDate: null`. The UI says so on every
result, in the footer, and on `/clinical-sources`. `GET /api/sources` reports
`reviewedCount: 0` — verified live on 2026-08-31.

**The clinical contact is Dr. Ryan Alexander**, the medical director who heads
the McNabb Center site running this pilot, and he is the audience for the
demo. That is a different thing
from having a reviewer: being the clinical point of contact is not the same
commitment as putting your name on 30 blocks of clinical guidance. The open
question is whether he takes the reviewer role himself or names someone on his
staff. Until one of those happens, the count stays at 0 and this section stands
exactly as written.

**The content came from Dr. Alexander in the first place.** The All4Knox
Clinical Summary 2026 is his; the toolkit's guidance was transcribed from it by
hand, once, and checked against the slides. That changes the *shape* of the
residual risk but not its existence: what is unverified is no longer whether the
clinical judgement is sound, but whether we transcribed his judgement faithfully
and whether the rule engines encode it correctly.

That makes the review ask much smaller than it looks. He is not being asked to
review a stranger's clinical reasoning — he is being asked to confirm that a
system renders his own guidance correctly.

**It does not, however, let anyone set `reviewedCount` to 30.** Authoring the
source is not the same act as attesting that the software reproduces it, and no
attestation exists until one is recorded through `/review`. Marking blocks
reviewed on the strength of "he wrote it anyway" would be precisely the
fabricated attestation this system was built to make impossible.

This is the correct state — the alternative (blank fields rendered as if review
had happened) would be a fabricated clinical attestation. `test_content.py`
asserts no block can claim a reviewer without a date.

**Before any real clinical use**, a named clinician must review each block and
record reviewer, review date, effective date, and next review date.

### Open clinical questions (need a clinician, not a developer)

The two below predate the reference documents. Those added more — the TennCare
dose limits (acted on in 2026.2, pending confirmation), whether a non-BESMART
NP/PA can prescribe for TennCare at all, and COWS ≥ 7 vs ≥ 11 within the
guideline. All are in [`project-plan.md`](project-plan.md) under "Clinical
questions raised by the reference documents", and on the 9/18 agenda.

1. **Oxycodone wait time.** Slide 4 says wait 12 hrs; slide 5 branches on
   >24 hrs since last dose. The toolkit surfaces both rather than picking one.
2. **Referral contact details.** The summary names McNabb, Cherokee/River
   Valley, ReVida and Cedar Recovery but gives no addresses, phone numbers or
   payer acceptance. These render as *not yet verified* and are deliberately
   `null` — the assistant is instructed to say "unverified" rather than imply a
   number exists. **Given the McNabb Center partnership, their details are the
   obvious first ones to confirm.**

### How the assistant is prevented from making things up

Independent layers:

1. **Corpus** — the toolkit content (`backend/app/rag/corpus.py`) plus three
   named reference documents (`backend/app/data/reference/manifest.json`).
   Nothing from the web. Every passage is labelled with its source type,
   issuer, date, pages, and whether its text was extracted or transcribed.
2. **Retrieval floors, per collection** — below its floor a collection returns
   nothing, and if every collection returns nothing the model is **never
   called**. Measured 2026-09-15 with `./a4k calibrate`:

   | Collection | On-corpus | Unrelated max | Floor |
   | --- | --- | --- | --- |
   | toolkit | 0.745–0.828 | 0.579 | 0.65 (`RAG_MIN_SCORE`) |
   | TN guidelines | 0.682–0.844 | 0.602 | 0.64 |
   | TennCare BESMART | 0.705–0.833 | 0.562 | 0.63 |

   Near-domain questions (extended-release naltrexone, methadone clinic rules)
   clear the floors; for those, layer 4 has to refuse, and on 2026-09-15 it did.
3. **One model call per source type** — the call writing the guideline section
   is never shown toolkit or BESMART passages, so it cannot attribute their
   rules to the guideline. The server writes the section headings.
4. **System prompt** — refuse, cite by number, never invent doses/wait
   times/phone numbers; present disagreeing positions with source and date;
   BESMART passages are payer rules, not dosing advice.
5. **Context budget** — passages and history are fitted to the 8192-token
   window server-side, so Ollama never silently truncates the prompt.

**Residual risk, measured 2026-09-15:** a section can still misread its own
source. In one of two runs the guideline section applied the statute's 16 mg
limit for NPs/PAs to physicians. Sectioning cannot prevent that; the citations
are the check, and the clinician must be able to read them.

Verified behaviour: *"warfarin dose for atrial fibrillation"* → `refused: true`,
0 citations, model never invoked. *"BUP positive with fentanyl"* → grounded
answer citing slide 7 at 0.82.

---

## 7. Immediate next steps

**Before the demo:** run the pre-demo checklist in
[`rules-of-engagement.md` §7](rules-of-engagement.md) — especially **warming the
model**, since a cold `gpt-oss:20b` load is a visible pause.

**Then, in priority order** — see [`project-plan.md`](project-plan.md) for the
full phased plan:

0. **Sign in as the seeded admin, change the password, and blank
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`.** They are only needed
   for the very first boot.
1. Set `LETSENCRYPT_EMAIL` in `.env` so cert-expiry warnings reach a human.
2. Get McNabb Center referral details verified (unblocks a whole content class).
3. Confirm with **Dr. Ryan Alexander** who signs off the 30 blocks — him or
   someone he names — then create that person's clinician account
   (`POST /api/admin/users`, role `clinician`) and walk them through `/review`.
4. **Friday 9/18 with Dr. Alexander** — agenda in
   `docs/meeting_notes/mcnabb_meeting_9_18_26_agenda.md`. Top item: content
   version 2026.2 moved the TennCare dose limits to TennCare's May 2026 BESMART
   update ahead of his confirmation.
5. Gerald is checking the 8 AI transcriptions against their page images
   (`backend/app/data/reference/transcriptions/`); set `checkedBy` when done.
6. Get the updated BESMART Program Description from TennCare.
7. Begin the literature review track — see
   [`research/publication-plan.md`](research/publication-plan.md).

---

## 8. Session log

| Date | Who | What changed |
| --- | --- | --- |
| 2026-08-30 | Emma | Initial commit, website skeleton, React/Vite frontend (Phase 1 tools, local content) |
| 2026-08-31 | Gerald + Claude | Clinical review workspace (`/review`): clinician sign-off vs admin QA enforced in code, content-hash invalidation, append-only audit trail. Landing page at `/`, sign-in + account pages, `./a4k` CLI. Fixed the header nav clipping and the toolkit card overlap. 44 tests. |
| 2026-08-31 | Gerald + Claude | Accounts + roles (visitor/basic/clinician/admin) on SQLite; persistent assistant conversations with inactivity sweep; per-user generation settings with server-side clamping; admin system-prompt variants with an **immutable safety preamble**; markdown rendering. Fixed three bugs found while building: seed-admin worker race, parallel session-minting race (404 on first question), and an admin being able to publish a prompt with no safety rules. 29/29 API + 8/8 browser checks. |
| 2026-08-31 | Gerald + Claude | Guided "TurboTax" interview wired up for all four tools (`useInterviewFlow` + the previously-unused `guided/` components and `guided.css`); 12/12 browser click-through checks. Agent design specified in project-plan Phase 2.5 with spike numbers. |
| 2026-08-31 | Gerald + Claude | `ed3cb88` on `gj_dev` — FastAPI backend; mechanical content export; TS↔Python parity harness (302 cases); RAG assistant on `gpt-oss:20b` with measured refusal threshold; full containerisation; live HTTPS at all4knox.axiomsystemslab.com; docs (handoff, ROE, project plan, publication plan). 73 files, +11,778 lines. `.env` verified absent from history. |
| 2026-09-15 | Gerald + Claude | Logos: All4Knox lockup in the header, footer acknowledgements band (lab, McNabb Center), partner-card logos. Fixed sticky elements hidden under the two-row header (progress bar fully hidden in production). Reference knowledge base: TN guidelines + TennCare BESMART as separate search tools with measured floors; 8 AI transcriptions of image/table pages (unchecked); per-source answer sections after a single call misattributed thresholds 3/3; context-window budget, truncation notice, `RAG_REFERENCE_ENABLED` kill switch; compose `RAG_MIN_SCORE` default 0.35 → 0.65. Content 2026.2: TennCare dose limits follow the May 2026 BESMART update (pending Dr. Alexander), non-BESMART pathway split by prescriber — 30 blocks. Index fingerprint covers citation labels. 9/18 agenda and transcription checklist written. 82 tests. |
| 2026-09-23 | Emma + Claude | Synced `emma_dev` with `main`: fast-forward to `ce98149` (PR #4), no conflicts. Brought in `CLAUDE.md`, both session handoffs, the reference-incorporation plan, McNabb 9/21 open questions, and the MAT/BESMART reference files in `docs/reference/`. Not yet pushed. Added a site **feedback survey**: a Feedback button in the header on every page opens a dialog with five 1–5 ratings (ease of use, layout/format, clarity, clinical usefulness, trust), role, found-what-you-needed, four free-text questions and an optional email, plus a do-not-include-patient-information warning. Anyone can submit, visitors included. Responses go in a new `feedback` SQLite table that is not tied to sessions, so the visitor sweep doesn't delete them. The questions are defined only in `backend/app/services/feedback.py` and served to the form by `GET /api/feedback/questions`. `./a4k feedback` exports responses as Markdown into `feedback/inbox/`; triage by moving files to `planned/`, `done/` or `declined/`. Response files are gitignored because they may contain emails or patient details. `GET /api/admin/feedback` (admin only). 94 tests, frontend build and lint clean. No rate limiting on submissions yet. Not deployed; the live site still runs the old build. Marked the 9/1 "suggestions channel" backlog item 🟡 in `project-plan.md`. |

**Append a row when you finish a session.** Keep it to what changed and why —
the git log has the detail.
