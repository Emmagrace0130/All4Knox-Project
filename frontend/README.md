# All4Knox Frontend

React + Vite + TypeScript implementation of the All4Knox Clinical Buprenorphine
Toolkit. See [`../All4Knox_Website_Skeleton.md`](../All4Knox_Website_Skeleton.md)
for the specification each section below refers to.

> **New to this app? Read [`../docs/frontend-guide.md`](../docs/frontend-guide.md)**
> — a full walkthrough: how a request flows, what every directory does, the
> local-first verification pattern, and the known dead code. This file is the
> quick reference; that one is the tour.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run lint
```

## Architecture

```
src/
├── app/            router + shell
├── components/     layout · toolkit · forms · common · guided (unused — see guide §9)
├── content/        ALL clinical guidance lives here (§19)
├── services/       deterministic rule evaluation (§23) + api.ts (backend client)
├── hooks/          useBackendStatus · useVerifiedResult
├── pages/          one file per route (§14)
├── types/          clinical content types
└── styles/         tokens · base · layout · components · assistant · print
```

### Clinical content is data, not JSX

No clinical guidance is written into a component. Every rule, pathway and
interpretation is a typed object under `src/content/` carrying its own
`source`, `contentVersion` and `review` metadata, so it can be reviewed and
updated without touching the UI — and so the FastAPI backend can later serve
the same shapes verbatim (§16–§18).

`src/services/` holds the matching logic that will move to
`app/services/*_rules.py`. It is deterministic and declarative: rules describe
*what* they match (`{ bup: true, fent: true }`), never *how*.

`src/content/registry.ts` aggregates every content block so `/clinical-sources`
reports the real state of the content set rather than a hand-kept list.

### Honesty rules baked into the UI

Clinical content is transcribed from the source presentation — see
[`../docs/source-extraction.md`](../docs/source-extraction.md) for what came
from which slide. Where the source is silent or inconsistent, the toolkit says
so rather than smoothing it over:

- A UDS combination with no matching rule reports that it is undocumented
  instead of falling through to the nearest rule.
- Positive findings the matched rule does not speak to are listed explicitly.
- Slides 4 and 5 give different wait times for oxycodone (12 hrs vs >24 hrs).
  Both are shown with their slide reference and a note to confirm which
  applies — the conflict is surfaced, not resolved in code.
- Referral fields that have not been verified render as *not yet verified*;
  contact details are never guessed.
- `entryStatus: 'pending'` renders a "guidance not yet entered" panel.
- No block claims a clinical review that has not happened.

### Backend wiring

The FastAPI backend **is** built ([`../backend/`](../backend/)) and this app is
wired to it. Each tool computes its result locally for instant response, then
confirms it against the API in the background and reports which path served the
answer — see [`../docs/frontend-guide.md`](../docs/frontend-guide.md) §6.

Both implementations of the clinical logic are held identical by exhaustive
parity tests (256 UDS panels, 36 prescribing combinations, 10 induction
combinations). See `../backend/tests/test_parity.py`.

### What is not built yet

The Phase 2 tools (COWS calculator, OUD diagnosis helper, naloxone guide, safety
check, follow-up checklist, referral finder), search, and the printable handouts
and forms. See [`../docs/project-plan.md`](../docs/project-plan.md) Phase 3.

## Routes

| Route | Page |
| --- | --- |
| `/` | Toolkit landing page (§5) |
| `/toolkit/prescribing` | Tennessee prescribing pathway (§6) |
| `/toolkit/start` | Induction decision aid (§7) |
| `/toolkit/uds` | UDS interpreter (§8) |
| `/toolkit/dosing` | Maintenance dosing (§9) |
| `/ask` | Ask All4Knox — retrieval-grounded assistant (§23) |
| `/learn/buprenorphine` | Buprenorphine-naloxone basics (§10) |
| `/referrals` | Referral directory (§11) |
| `/resources` | Resources (§12) |
| `/about` | About, governance, privacy (§21–§22) |
| `/clinical-sources` | Source and version control (§20) |

## Privacy

No PHI is requested or collected. All state is component-local; nothing is
persisted or transmitted (§22).
