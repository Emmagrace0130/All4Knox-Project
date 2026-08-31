# Session Handoff — All4Knox Clinical Provider Toolkit

**Last updated:** 2026-08-31, end of the overnight session before the 11:30 demo.

**Branch:** `gj_dev` at `3a0b4cc` — the overnight work (7,235 lines across
64 files) is **committed and pushed**. `main` is still at `36fa675`; the
`gj_dev` → `main` merge is pending on GitHub and is Emma's call. Always check
`git log --oneline --all` and `git status` before assuming which branch has
what.
**Maintainers:** Emma (repo owner, `Emmagrace0130/All4Knox-Project`) · Gerald Jones
**Partner:** McNabb Center, Knoxville TN — this app is a pilot tool for them.

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
| **Public URL** | <https://all4knox.axiomsystemslab.com> (valid Let's Encrypt cert, expires 2026-11-28) |
| **API** | `https://all4knox.axiomsystemslab.com/api/...` — same origin, proxied by our nginx |
| **Local debug** | API `127.0.0.1:8410`, web `127.0.0.1:8411` |
| **Containers** | `all4knox-api`, `all4knox-web` — both healthy |
| **Assistant** | `gpt-oss:20b` via host Ollama; 31-chunk vector index; ~6 s to first answer |
| **Branch** | `gj_dev` at `3a0b4cc`, pushed. `main` at `36fa675` — merge pending |
| **Database** | SQLite at `/data/all4knox.db` on the `all4knox-data` volume |
| **First admin** | Seeded from `SEED_ADMIN_*` in `.env`. **Blank those out and change the password after first sign-in.** |
| **Clinical review** | **0 of 29 blocks reviewed.** Workflow is built at `/review`. Clinical contact is Dr. Ryan Alexander (medical director, McNabb Center) — sign-off not yet started. |
| **Tests** | 44 backend tests passing · frontend build + lint clean |
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
- Full containerisation, public HTTPS, automatic TLS renewal.

### What is NOT done

- **No clinical review has happened — 0 of 29.** The workflow exists at
  `/review` and there is now a named clinical contact — **Dr. Ryan Alexander**,
  the medical director who heads the McNabb Center site running this pilot — but no block has been signed
  off yet. Until that happens the toolkit is not usable for real patient care.
  See §6.
- `all4knox.rubyrecon.com` is not live (Emma owns that domain — see §5).
- `LETSENCRYPT_EMAIL` in `.env` is blank; expiry warnings go nowhere.
- Phase 2 tools (COWS calculator, OUD diagnosis helper, naloxone guide,
  follow-up checklist) are not built.
- Two clinical ambiguities remain unresolved (§6).

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
│   │   ├── rag/                 # corpus.py, store.py, ollama_client.py, assistant.py
│   │   ├── models/clinical.py   # pydantic request/response
│   │   ├── core/config.py       # settings from env
│   │   └── data/content/*.json  # GENERATED — do not hand-edit
│   ├── tests/                   # 29 tests incl. TS/Python parity
│   └── tools/calibrate_threshold.py
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
    ├── project-plan.md          # phases, milestones, tracking
    ├── source-extraction.md     # what came from which slide
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

# force a vector index rebuild (after changing content or embedding model)
curl -X POST localhost:8410/api/assistant/reindex

# re-measure the retrieval refusal threshold
python3 backend/tools/calibrate_threshold.py
```

### Frontend dev server against the containerised API

```bash
cd frontend
VITE_API_BASE_URL=http://localhost:8410/api npm run dev
```

---

## 5. Adding `all4knox.rubyrecon.com` (Emma)

The skeleton (§3) documents `all4knox.rubyrecon.com` as the working URL. It is
not live because `rubyrecon.com` has a wildcard `*.rubyrecon.com` → parking host
`207.207.210.x`, and `all4knox` has no explicit record to override it.

**Emma:** add an A record at the `rubyrecon.com` registrar —

```text
Type: A     Host: all4knox     Value: 160.36.100.65     TTL: 300
```

Then, **after confirming `getent hosts all4knox.rubyrecon.com` shows
160.36.100.65**:

```bash
# .env — comma-separated, NO spaces
FRONTEND_VIRTUAL_HOST=all4knox.axiomsystemslab.com,all4knox.rubyrecon.com

docker compose up -d          # recreate web; acme-companion issues a SAN cert
docker logs -f nginx-proxy-acme --tail 40
```

No rebuild needed. **Do not do this before DNS resolves** — failed validations
count against Let's Encrypt rate limits (see rules-of-engagement §5).

---

## 6. Clinical safety — the part that actually matters

**Nothing in this toolkit has been reviewed by a clinician.** All 29 content
blocks report `reviewedBy: null`, `reviewedDate: null`. The UI says so on every
result, in the footer, and on `/clinical-sources`. `GET /api/sources` reports
`reviewedCount: 0` — verified live on 2026-08-31.

**The clinical contact is Dr. Ryan Alexander**, the medical director who heads
the McNabb Center site running this pilot, and he is the audience for the
demo. That is a different thing
from having a reviewer: being the clinical point of contact is not the same
commitment as putting your name on 29 blocks of clinical guidance. The open
question is whether he takes the reviewer role himself or names someone on his
staff. Until one of those happens, the count stays at 0 and this section stands
exactly as written.

This is the correct state — the alternative (blank fields rendered as if review
had happened) would be a fabricated clinical attestation. `test_content.py`
asserts no block can claim a reviewer without a date.

**Before any real clinical use**, a named clinician must review each block and
record reviewer, review date, effective date, and next review date.

### Two open clinical questions (need a clinician, not a developer)

1. **Oxycodone wait time.** Slide 4 says wait 12 hrs; slide 5 branches on
   >24 hrs since last dose. The toolkit surfaces both rather than picking one.
2. **Referral contact details.** The summary names McNabb, Cherokee/River
   Valley, ReVida and Cedar Recovery but gives no addresses, phone numbers or
   payer acceptance. These render as *not yet verified* and are deliberately
   `null` — the assistant is instructed to say "unverified" rather than imply a
   number exists. **Given the McNabb Center partnership, their details are the
   obvious first ones to confirm.**

### How the assistant is prevented from making things up

Three independent layers:

1. **Corpus** — built only from the approved clinical content
   (`backend/app/rag/corpus.py`), not from the source PowerPoint or the web.
2. **Retrieval floor** — `RAG_MIN_SCORE=0.65`. Below it the model is **never
   called**, so it cannot answer from its own weights. This value is *measured,
   not guessed*: on 2026-08-31, questions the content answers scored
   **0.745–0.828**; unrelated clinical questions (warfarin, metformin,
   pneumonia, chest pain, eczema, ECG) topped out at **0.579**. 0.65 sits in the
   gap. Re-run `backend/tools/calibrate_threshold.py` after changing the
   embedding model or the corpus.
3. **System prompt** — refuse, cite by number, never invent doses/wait
   times/phone numbers, never claim the toolkit covers something it does not.

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
3. Confirm with **Dr. Ryan Alexander** who signs off the 29 blocks — him or
   someone he names — then create that person's clinician account
   (`POST /api/admin/users`, role `clinician`) and walk them through `/review`.
4. Add `all4knox.rubyrecon.com` once Emma has added the DNS record (§5).
5. Begin the literature review track — see
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

**Append a row when you finish a session.** Keep it to what changed and why —
the git log has the detail.
