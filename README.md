# All4Knox-Project

Platform for Clinical Providers in TN — a locally hosted, quick-reference
clinical toolkit for Tennessee primary care and other clinical providers who are
learning to prescribe buprenorphine-naloxone (Suboxone) for opioid use disorder.

Built with the **McNabb Center**, Knoxville TN.

**Live:** <https://all4knox.axiomsystemslab.com>

> **Nothing in this toolkit has been clinically reviewed.** All 30 content
> blocks report themselves as unreviewed, in the UI and via `GET /api/sources`.
> Before any production use a named clinician must review each block and record
> the reviewer, review date, effective date and next review date.

## Layout

| Path | Contents |
| --- | --- |
| [`All4Knox_Website_Skeleton.md`](All4Knox_Website_Skeleton.md) | Product specification |
| [`frontend/`](frontend/) | React + Vite + TypeScript toolkit |
| [`backend/`](backend/) | FastAPI service — clinical rules + RAG assistant |
| [`docker-compose.yml`](docker-compose.yml) | Both services, wired for the shared server |
| [`CLAUDE.md`](CLAUDE.md) | **Team working agreements**: whose handoff is whose; shared vs personal docs |
| `docs/<name>_sessions/session-handoff.md` | **Start here.** Each maintainer keeps their own ([Gerald](docs/gerald_sessions/session-handoff.md), [Emma](docs/emma_sessions/session-handoff.md)) covering project state, gotchas and common tasks. `docs/session-handoff.md` is the old shared copy, frozen at 2026-09-15. |
| [`docs/reference-incorporation-plan.md`](docs/reference-incorporation-plan.md) | How the Sept 2026 BESMART, MAT checklist and readiness documents get into the app |
| [`docs/frontend-guide.md`](docs/frontend-guide.md) | Walkthrough of the React app — structure, patterns, conventions |
| [`docs/rules-of-engagement.md`](docs/rules-of-engagement.md) | **Read before any `docker` command** — shared server |
| [`docs/project-plan.md`](docs/project-plan.md) | Phases, milestones, tracking |
| [`docs/clinical-review-plan.md`](docs/clinical-review-plan.md) | How clinical sign-off works, and why admins cannot do it |
| [`docs/compliance-readiness-plan.md`](docs/compliance-readiness-plan.md) | McNabb's external-hosting approval process, our self-assessment, and the pilot survey plan |
| [`docs/research/`](docs/research/) | Literature review, publication and funding plan |
| [`docs/source-extraction.md`](docs/source-extraction.md) | What was transcribed from the clinical summary, by slide |

## Getting started

```bash
cp .env.example .env      # then fill in the blanks
docker compose up -d --build

curl localhost:8410/api/health
open http://localhost:8411
```

Frontend only, against the containerised API:

```bash
cd frontend && npm install
VITE_API_BASE_URL=http://localhost:8410/api npm run dev
```

## How it fits together

```text
Internet -> nginx-proxy (shared) -> all4knox-web ──> SPA
                                         └─ /api ──> all4knox-api ──> Ollama (shared)
```

The four decision tools are **deterministic** — no model is involved. The
optional "Ask All4Knox" assistant answers only from the approved clinical
content and refuses otherwise.

## Two rules that matter

**1. Clinical content has one source of truth.** `frontend/src/content/` is it.
`backend/app/data/content/*.json` is generated from it — never hand-edit that
directory. After changing content:

```bash
cd frontend && npm run export:content && npm run export:parity
```

**2. The rule engines exist twice and must stay identical.** The frontend keeps
a local copy so the toolkit works when the API is down. `backend/tests/` replays
the entire input space of every tool — 256 UDS panels, 36 prescribing
combinations, 10 induction combinations — through both implementations and
requires identical answers. If parity fails, fix the divergence; do not
regenerate the fixture.

```bash
docker run --rm -v "$PWD/backend":/app -w /app -e HOME=/tmp python:3.12-slim \
  sh -c "pip install -q pytest pydantic pydantic-settings && python -m pytest tests/ -q"
```

## Clinical content status

Guidance is transcribed from the *All4Knox Clinical Summary 2026* presentation —
including the six SmartArt decision trees, which carry most of the clinical
logic. [`docs/source-extraction.md`](docs/source-extraction.md) records what came
from which slide.

Two things need a clinician's decision, and are flagged in the UI rather than
resolved in code:

1. **Oxycodone wait time.** Slide 4 says wait 12 hrs; slide 5 branches on
   >24 hrs since last dose.
2. **Referral contact details.** The presentation names the organisations but
   has no addresses, phone numbers or payer acceptance, so those show as
   *not yet verified*.

`/clinical-sources` lists every block and its current status.
