# Frontend Guide — a walkthrough of the All4Knox app

**Audience:** anyone picking up the React app for the first time.
**Verified against the code on:** 2026-08-31 (`gj_dev`, post-`ed3cb88`)

Companion docs: [`session-handoff.md`](session-handoff.md) for project state ·
[`rules-of-engagement.md`](rules-of-engagement.md) before any `docker` command ·
[`../All4Knox_Website_Skeleton.md`](../All4Knox_Website_Skeleton.md) for the
spec the § references point at.

> As with every doc here: **the code is the authority.** If this file and the
> code disagree, the code wins — fix this file as part of your change.

---

## 1. The 60-second version

It is a **React 19 + Vite 8 + TypeScript** single-page app. Roughly 60 source
files, ~300 kB of JS gzipped to ~92 kB, builds in under a second.

Three ideas explain almost every design decision in it:

1. **Clinical guidance is data, never JSX.** No rule, dose or interpretation is
   written into a component. It all lives as typed objects in `src/content/`.
2. **The app tells the truth about what it does not know.** Unverified, missing
   and contradictory source material renders as such, rather than being smoothed
   over.
3. **The clinical logic runs locally and is verified against the API.** Results
   appear instantly from local rules, then get confirmed by the backend in the
   background.

If you understand those three, the rest is ordinary React.

---

## 2. How a request flows

```text
main.tsx                     mounts <AppRouter>, imports the 6 stylesheets
  └── app/router.tsx         BrowserRouter + <ScrollManager> + route table
        └── app/App.tsx      the shell: skip-link, <Header>, <Outlet>, <Footer>
              └── pages/*    one file per route
                    ├── components/layout/PageContainer   page chrome
                    ├── components/toolkit/DecisionStep    numbered question
                    ├── components/forms/RadioGroup        selection tiles
                    ├── services/*Rules.ts                 LOCAL evaluation
                    ├── hooks/useVerifiedResult            API confirmation
                    └── components/toolkit/ResultCard      the answer
```

`ScrollManager` resets scroll between tools but honours in-page anchors, so
`/learn/buprenorphine#precipitated-withdrawal` from the induction tool lands on
the right section instead of the top of the page.

---

## 3. Directory map

```text
frontend/src/
├── main.tsx              entry — mounts the router, imports styles
├── app/
│   ├── router.tsx        route table (§14) + scroll behaviour
│   └── App.tsx           shell: header, outlet, footer, skip-link
├── content/              ★ ALL clinical guidance — the source of truth
├── services/             deterministic rule evaluation + the API client
├── hooks/                backend status + result verification
├── pages/                one component per route
├── components/
│   ├── layout/           Header, Navigation, Footer, PageContainer, BackendStatus
│   ├── toolkit/          ToolkitCard, DecisionStep, ResultCard, ClinicalAlert, SourceBadge
│   ├── forms/            RadioGroup, CheckboxGroup
│   ├── common/           Button, Card, VerificationBadge
│   └── guided/           the TurboTax-style interview — see §9
├── types/clinical.ts     every clinical shape, heavily commented
└── styles/               tokens · base · layout · components · guided · assistant · print
```

The `★` is the thing to understand before you touch anything.

---

## 4. `src/content/` — the part that matters most

**This directory is the single source of truth for all clinical guidance in the
entire project, frontend and backend.**

The backend does not have its own copy. `backend/app/data/content/*.json` is
*generated* from these files by
[`frontend/tools/exportContent.ts`](../frontend/tools/exportContent.ts). The
reason is safety: the guidance was transcribed from the All4Knox Clinical
Summary 2026 once, by hand, and checked against the slides. A second hand-typed
copy could drift, and a drifted copy of clinical guidance is the worst defect
this project could ship (skeleton §21: *no silent rule changes*).

| File | Holds |
| --- | --- |
| `version.ts` | `CONTENT_VERSION` (`2026.2` — its comment lists what each version changed), source document name, the `PENDING_REVIEW` object every block currently uses |
| `prescribing.ts` | 6 Tennessee prescribing pathways + the form's option lists |
| `induction.ts` | 5 induction pathways / 8 outcomes, intro text, escalation banner |
| `uds.ts` | 5 UDS rules + monitoring guidance + the "FENT or other opioid" footnote |
| `dosing.ts` | Overview, FDA-vs-TN limits, cravings yes/no guidance |
| `referrals.ts` | 4 organisations + region/need filter options |
| `learn.ts` | Buprenorphine-naloxone education |
| `resources.ts` | Resource sections + external links |
| `toolkit.ts` | Landing page cards + quick-start links |
| `governance.ts` | Emergency notice, PHI notice, decision-support labels |
| `registry.ts` | **Derived** — aggregates every block above so `/clinical-sources` reports the real state rather than a hand-kept list that drifts |

### Editing clinical content

```bash
# 1. edit frontend/src/content/<module>.ts
# 2. regenerate the backend copy AND the parity fixture — both, always
cd frontend
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/..":/work -w /work/frontend \
  -e npm_config_cache=/tmp/.npm node:22-alpine \
  sh -c "npm ci && npm run export:content && npm run export:parity"
# 3. backend tests must still pass (they will fail loudly if you skipped step 2)
# 4. docker compose up -d --build
```

**Never hand-edit `backend/app/data/content/*.json`.** Your change will be
overwritten by the next export, and until then the two copies disagree.

---

## 5. `src/services/` — deterministic logic, plus the API client

### The rule engines

`udsRules.ts` · `prescribingRules.ts` · `inductionRules.ts` · `referralSearch.ts`

Pure functions, no React, no network, no model. They read from `src/content/`
and return a matching rule or `null`. They are deliberately *declarative*: a
rule states **what** it matches (`{ bup: true, fent: true }`), never **how**,
which is what let them be ported to Python unchanged.

Three behaviours worth knowing, because they look like bugs and are not:

- **`interpretUDS` returns every applicable rule**, not just the best one —
  `primary`, `additional`, and `unaddressed` (positive findings no matched rule
  speaks to). The UI lists `unaddressed` explicitly rather than letting a
  finding vanish.
- **`evaluatePrescribing` sorts by specificity.** More matching criteria wins,
  so a TennCare+BESMART+MD/DO pathway beats a generic uninsured one.
- **`searchReferrals` never excludes on an unverified field.** If
  `acceptsTenncare` is `null` the org is *kept* and flagged `uncertain`.
  Filtering it out would read to a clinician as "does not accept TennCare",
  which the directory does not actually know.

### `api.ts`

Typed `fetch` client. Base URL is `import.meta.env.VITE_API_BASE_URL ?? '/api'`
— relative by default, because in production nginx proxies `/api` on the same
origin, so there is no CORS preflight on a clinical request.

Everything has an 8-second timeout except the assistant (180 s). `askAssistantStream`
parses SSE by hand rather than using `EventSource`, because `EventSource` cannot
issue a POST and the question belongs in a body, not a URL.

---

## 6. `src/hooks/` — the local-first verification pattern

This is the least obvious part of the app, and the most important to understand
before changing a tool page.

**The problem.** The frontend keeps its own copy of the clinical logic so the
toolkit still works when the API is unreachable. But if the two copies ever
disagreed, a clinician could get different guidance depending on whether the
network was up — with no way to tell which they got.

**The solution, in three parts:**

1. **Compute locally, render instantly.** A clinician mid-visit should never
   wait on a round-trip for logic that is pure matching.
2. **Ask the API the same question in parallel** (`useVerifiedResult`) and
   compare the returned identifier.
3. **Say which one you got.** `VerificationBadge` renders one of:
   - *Confirming with clinical API…*
   - **Confirmed by clinical API** (green)
   - **Offline — local clinical rules** (amber) — not a degraded result, the
     same logic, just unconfirmed
   - **Result disagreement — do not rely on this** (red, `role="alert"`)

The red state should be unreachable. `backend/tests/test_parity.py` replays the
*entire input space* of every tool through both implementations — **256** UDS
panels (2⁸ analytes), **36** prescribing combinations, **10** induction
combinations — and requires identical answers. If the badge ever goes red in
production, the deployed frontend and backend are on different content versions.

`useBackendStatus` does the same thing at app level, polling `/api/health` every
30 s to drive the footer indicator.

---

## 7. The pages

| Route | Page | Shape |
| --- | --- | --- |
| `/` | `Home` | **Landing page** — mission, partners, routing, and the toolkit cards |
| `/toolkit` | `ToolkitHome` | The toolkit dashboard |
| `/sign-in` | `SignIn` | Optional sign-in |
| `/account` | `Account` | Account + generation settings (clinician/admin) |
| `/toolkit` | `ToolkitHome` | Hero → quick-start links → 6 tool cards → "Planned for Phase 2" |
| `/toolkit/prescribing` | `PrescribingTool` | 3 steps (coverage → prescriber → BESMART) → pathway |
| `/toolkit/start` | `StartSuboxoneTool` | Situation → follow-ups → induction outcome |
| `/toolkit/uds` | `UDSInterpreter` | Checkbox panel → live interpretation |
| `/toolkit/dosing` | `DosingTool` | Reference + one cravings question |
| `/toolkit/*/guided` | `pages/guided/*` | **Guided interview variants — see §9** |
| `/ask` | `AskAll4Knox` | **New** — the RAG assistant |
| `/learn/buprenorphine` | `LearnBuprenorphine` | Education, anchor-linked from induction |
| `/referrals` | `ReferralDirectory` | Filters → organisation cards |
| `/resources` | `Resources` | Sections + external links |
| `/about` | `About` | Governance, privacy, scope |
| `/clinical-sources` | `ClinicalSources` | All 30 blocks, status and review state |

### Two pages that are not like the others

**`UDSInterpreter`** has no submit button — interpretation updates as you check
boxes. But an untouched form is *not* treated as an all-negative screen: there
is an explicit **"Nothing detected on this screen"** action, tracked by
`confirmedNegative`. Otherwise landing on the page would silently look like a
clean screen.

**`AskAll4Knox`** is the only page that talks to a model. It streams tokens over
SSE, shows citations *before* the answer (they arrive first), and hides itself
behind an explanatory panel when the assistant is unavailable — because every
other tool works without it. Its refusal state is a first-class UI state, not an
error.

---

## 8. Styling

Plain CSS, no framework, no CSS-in-JS. Seven stylesheets imported in order by
`main.tsx`:

| File | Role |
| --- | --- |
| `tokens.css` | Custom properties — colour, spacing (`--s-1`…`--s-9`), radii, shadows |
| `base.css` | Element defaults, focus rings, skip-link |
| `layout.css` | Page shells, grids, header/footer |
| `components.css` | The bulk — cards, steps, results, alerts, tags |
| `guided.css` | The guided interview — tiles, screens, progress, result screen |
| `assistant.css` | Backend status, verification badge, assistant page |
| `print.css` | `.print-hide` and print layout — clinicians print result cards |

Conventions: BEM-ish (`.result__section--steps`), tokens for every colour and
space, `.print-hide` on anything that should not print. **Anything
`position: sticky` must offset from `var(--header-h)`**, which `Header.tsx`
measures and publishes. The header is two rows at every width, and the old
hard-coded offsets hid the guided-interview progress bar completely. The visual direction in
`tokens.css` is *"guided-interview product UI in the TurboTax mould"* — friendly,
high contrast, generous whitespace.

---

## 9. The guided interview (the "TurboTax" flow)

The McNabb Center — the end customer — described the experience they wanted as
**TurboTax-like**: one question per screen, a visible progress bar, large tap
targets, an optional "why we ask", and the answers echoed back at the end so any
one of them can be corrected without starting over.

`src/components/guided/` implements exactly that, and it is now wired in.

### The pieces

| Piece | Role |
| --- | --- |
| `InterviewShell` | Centred column, progress bar, "Exit to toolkit" |
| `ProgressBar` | *Step N of M* — M shrinks and grows with conditional questions |
| `QuestionScreen` | One big question, "Why we ask" disclosure, Back/Continue |
| `SelectionTiles` / `CheckTiles` | Large single- and multi-select targets |
| `ResultScreen` | Confirmation header, **editable answer chips**, actions |
| `hooks/useInterviewFlow.ts` | Sequences the screens — the controller |
| `styles/guided.css` | 366 lines, imported by `main.tsx` |

### Routes

Guided flows live alongside the full-view pages rather than replacing them:

| Full view | Guided |
| --- | --- |
| `/toolkit/prescribing` | `/toolkit/prescribing/guided` |
| `/toolkit/start` | `/toolkit/start/guided` |
| `/toolkit/uds` | `/toolkit/uds/guided` |
| `/toolkit/dosing` | `/toolkit/dosing/guided` |

Every landing-page card carries a **Guided walkthrough** link, every full-view
page has a *"Use the guided walkthrough instead"* switch at the top, and every
guided result screen offers *"Switch to the full view"*.

**Both presentations use the same content, the same deterministic engines and
the same API verification.** Only the presentation differs — which is why
adding this could not change any clinical answer.

### `useInterviewFlow` — what it actually does

It holds no clinical logic. Steps are declared by each guided page from the
content modules; the answers it collects go to the same engines the full-view
pages use. Three behaviours are worth knowing:

1. **Conditional questions.** A step with a `when` predicate is skipped
   entirely — it never renders and never counts toward the progress total.
   BESMART is only asked for TennCare, so the bar reads *Step 1 of 3* until the
   provider picks TennCare, then becomes *of 4*.
2. **Stale answers are discarded.** Answering a question that makes a later one
   unreachable clears that later answer. Go back from a TennCare+BESMART result
   and switch to Private, and the BESMART answer is gone — it can never drive a
   result it no longer applies to. This mirrors the full-view pages, which
   reset BESMART when the provider leaves TennCare.
3. **Single-select auto-advances; multi-select never does.** On a
   one-question screen a second click on Continue carries no information. On a
   "select all that apply" screen the provider decides when they are done.

### The UDS all-negative case

The UDS step is `optional: true`, so Continue works with nothing selected —
an all-negative screen is a real clinical result, not an unfinished form. The
button reads *"Nothing was detected — continue"* and the result screen says
*"Screen recorded as negative"*, so it can never be mistaken for a form the
provider simply did not fill in. This is the guided equivalent of the
`confirmedNegative` flag in the full-view page (§7).

### Verified by clicking, not by reasoning

The flow controller is driven through a real browser over CDP against the live
site — conditional expansion, skipping, stale-answer clearing, the all-negative
path, and the dynamic induction follow-ups. All 12 interaction checks pass.
The driver script is not committed; re-create it from this section if you
change the controller.

## 9b. The landing page, and why the tools are on it

`/` is the landing page (mission, partners, routing) and `/toolkit` is the
toolkit dashboard.

That split risks breaking something the spec is emphatic about: skeleton §5 and
§27 say a busy clinician must reach a tool in one click and must never be made
to read first. So **the six toolkit cards are rendered on the landing page
too**. Nothing is further away than it was, and the page still explains what
All4Knox is to someone arriving cold — a McNabb Center partner, a funder, or a
clinician who has never seen it.

If you add anything to `/`, keep the tool cards above the fold on a laptop.

### Partner logos

`PARTNERS` in `pages/Home.tsx` has a `logo: null` slot per organisation. A null
logo renders the organisation's name as a text plate — never a broken image,
and never a placeholder mark implying an endorsement nobody granted. Drop real
files in once we have written permission to use them; the 96px box is sized so
they land without reflowing anything.

---

## 9c. A CSS trap that bit us — do not reintroduce it

The header nav was clipping its first items **at every width**, hiding them
behind the logo. The cause is worth knowing because it is invisible to the
usual checks:

```css
.nav      { overflow-x: auto; }        /* scrollable */
.nav__list{ justify-content: flex-end; } /* ← the bug */
```

In a scrollable flex container, `justify-content: flex-end` pushes overflow off
the **left** edge. `scrollWidth` does not report it (it equalled `clientWidth`
while items were demonstrably off-screen at x=183), and no amount of scrolling
reaches it. The items just vanish under whatever sits to their left.

The fix is `width: max-content` + `margin-left: auto` on the list: it still
right-aligns when it fits, and scrolls correctly from the left when it does
not. **Never put `justify-content: flex-end` on an overflow-scrolling flex
container.**

---

## 10. Conventions to follow

1. **Never put clinical text in a component.** It goes in `src/content/` with
   `source`, `contentVersion` and `review` metadata.
2. **Never claim a review that has not happened.** `null` renders as *"Pending
   clinical review"*. `backend/tests/test_content.py` enforces that no block can
   name a reviewer without a date.
3. **Never guess a fact.** Unverified fields render *"Not yet verified"*.
   Contact details are `null` on purpose.
4. **Surface conflicts, do not resolve them in code.** Slides 4 and 5 disagree
   on the oxycodone wait time; both are shown with slide references.
5. **A new tool needs all four:** content in `src/content/`, a Python engine
   port, parity fixture coverage, and tests. The parity guarantee is only worth
   something if it is total.
6. **Result cards follow skeleton §27 ordering:** short answer → next actions →
   read more → source + version. `ResultCard` already does this; use it rather
   than hand-rolling a result surface.

---

## 11. Running it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173  — proxies nothing; see below
npm run build      # tsc -b && vite build
npm run lint       # oxlint, 0 warnings expected
```

Against the containerised API:

```bash
VITE_API_BASE_URL=http://localhost:8410/api npm run dev
```

Without that variable the dev server has no `/api`, so every tool falls back to
local rules and the footer shows **"Offline — local clinical rules"**. That is
correct behaviour, not a bug — and it is a convenient way to test the offline
path deliberately.

Local Node is 18, but Vite 8 needs 20+. All Node work in this project runs in a
container (see the command in §4) — that is why, not preference.

### Generator scripts

| Command | Does |
| --- | --- |
| `npm run export:content` | `src/content/` → `backend/app/data/content/*.json` |
| `npm run export:parity` | Runs the TS engines over their whole input space → `backend/tests/fixtures/parity.json` |

Both bundle through `vite.export.config.ts` (SSR mode) because the source uses
extensionless imports that plain Node cannot resolve.

---

## 12. Where to start reading

In this order:

1. `src/types/clinical.ts` — every shape, with the reasoning in comments
2. `src/content/uds.ts` — the smallest complete content module
3. `src/services/udsRules.ts` — the matching logic for it
4. `src/pages/UDSInterpreter.tsx` — how the two meet the UI
5. `src/hooks/useVerifiedResult.ts` — the local-first/verified pattern
6. `src/components/toolkit/ResultCard.tsx` — the single result surface

That path covers one full vertical slice of the app. Everything else is the
same pattern with different content.
