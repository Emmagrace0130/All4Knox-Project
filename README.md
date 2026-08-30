# All4Knox-Project

Platform for Clinical Providers in TN — a locally hosted, quick-reference
clinical toolkit for Tennessee primary care and other clinical providers who are
learning to prescribe buprenorphine-naloxone (Suboxone) for opioid use disorder.

## Layout

| Path | Contents |
| --- | --- |
| [`All4Knox_Website_Skeleton.md`](All4Knox_Website_Skeleton.md) | Product specification |
| [`docs/source-extraction.md`](docs/source-extraction.md) | What was transcribed from the clinical summary, by slide |
| [`frontend/`](frontend/) | React + Vite + TypeScript toolkit (Phase 1) |

The FastAPI backend described in §16 of the skeleton is not built yet. The
frontend runs standalone: clinical rules live in `frontend/src/content/` in the
shapes the API will return, so adding the backend will not require UI changes.

## Getting started

```bash
cd frontend
npm install
npm run dev
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

**Nothing in the toolkit has been clinically reviewed.** Before any production
use, a named clinician must review each block and record the reviewer, review
date, effective date and next review date. `/clinical-sources` lists every block
and its current status.
