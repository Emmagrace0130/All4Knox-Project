# Session Handoff — All4Knox Clinical Provider Toolkit

**Last updated:** 2026-08-31 (overnight session before the 11:30 demo)
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

git log --oneline -10          # what actually landed since this doc's date
git status                     # uncommitted work in progress?
docker compose ps              # is the stack up, and healthy?
curl -s localhost:8410/api/health | python3 -m json.tool
ls docs/                       # have new docs appeared?
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

### What works end to end

- All four Phase-1 decision tools (prescribing, induction, UDS, dosing) served
  by FastAPI, rendered by the existing React UI.
- Referral directory, resources, and the clinical sources/version register.
- "Ask All4Knox" retrieval assistant with streaming answers, citations and
  structural refusal.
- Full containerisation, public HTTPS, automatic TLS renewal.

### What is NOT done

- **No clinical review has happened.** All 29 content blocks report
  `reviewedBy: null`. This is correct and deliberate — but it means the toolkit
  is not usable for real patient care. See §6.
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
  sh -c "pip install -q pytest pydantic pydantic-settings && python -m pytest tests/ -q"
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

## 4. Common tasks

```bash
cd /home/gerald/GITS_REPOS/GIT_PLAY_GROUNDs/All4Knox-Project

# status / logs
docker compose ps
docker compose logs -f api

# rebuild after code changes
docker compose up -d --build

# run the test suite
docker run --rm -v "$PWD/backend":/app -w /app -e HOME=/tmp python:3.12-slim \
  sh -c "pip install -q pytest pydantic pydantic-settings && python -m pytest tests/ -q"

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
`reviewedCount: 0`.

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

1. Set `LETSENCRYPT_EMAIL` in `.env` so cert-expiry warnings reach a human.
2. Get McNabb Center referral details verified (unblocks a whole content class).
3. Identify a named clinical reviewer and start working through the 29 blocks.
4. Add `all4knox.rubyrecon.com` once Emma has added the DNS record (§5).
5. Begin the literature review track — see
   [`research/publication-plan.md`](research/publication-plan.md).

---

## 8. Session log

| Date | Who | What changed |
| --- | --- | --- |
| 2026-08-30 | Emma | Initial commit, website skeleton, React/Vite frontend (Phase 1 tools, local content) |
| 2026-08-31 | Gerald + Claude | FastAPI backend; mechanical content export; TS↔Python parity harness (302 cases); RAG assistant on `gpt-oss:20b` with measured refusal threshold; full containerisation; live HTTPS at all4knox.axiomsystemslab.com; docs (handoff, ROE, project plan, publication plan) |

**Append a row when you finish a session.** Keep it to what changed and why —
the git log has the detail.
