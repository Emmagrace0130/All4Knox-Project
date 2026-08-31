# All4Knox — Research, Publication & Funding Plan

**Status:** planning. Nothing here has been executed yet.
**Owners:** Gerald Jones, Emma
**Partner:** McNabb Center, Knoxville TN

> ### ⚠️ Verification requirement
> This document contains **no literature citations**, deliberately. It sets out
> *what to search for* and *where to publish* — the searches themselves have not
> been run. **Do not cite anything from this file.** Every claim about prior
> work must be established by an actual search and read before it appears in a
> manuscript. Venue names, funding mechanisms and policy facts below should
> likewise be re-confirmed against current sources, since scope, deadlines and
> policy all change.

---

## 1. Why this project may be publishable

All4Knox on its own is a well-built clinical toolkit. Well-built toolkits are
generally **not** publishable in top venues — the bar is a *contribution*, not
an *artifact*. The contribution has to be argued, and there are three candidate
arguments here. They are not equally strong.

### 1a. The systems argument — strongest, and unique to this group

This project sits next to an existing body of work in the same lab:

| Repo | What it is |
| --- | --- |
| `OPIOID_SD_MODEL_OPTIMIZATION` | Hybrid System Dynamics + ABM of the **Tennessee** opioid epidemic, with LLM-powered heterogeneous agents |
| `Annual_OUD_SD_ABM` | NSDUH-backed data foundation for annual OUD SD/ABM work |
| `WSC25_ABM_LLM` | Winter Simulation Conference work on ABM + LLM |
| **`All4Knox-Project`** | **A provider-side intervention in the same system** |

Those models estimate what happens to the Tennessee opioid epidemic when
treatment capacity changes. All4Knox is an **actual instrument for changing one
of their parameters** — provider willingness and ability to prescribe
buprenorphine.

That closes a loop most simulation papers cannot close:

```text
SD/ABM model of the TN opioid epidemic
        │  identifies provider capacity as a leverage point
        ▼
All4Knox toolkit deployed with the McNabb Center
        │  measured change in provider behaviour
        ▼
Empirically grounded parameters fed back into the model
        │
        ▼
Re-estimated population-level impact
```

**This is the most defensible contribution: an intervention designed from a
systems model, measured in the field, and fed back as calibration.** It is
squarely industrial-and-systems-engineering, it is not a "we built an app"
paper, and almost nobody else is positioned to do it — it requires the model,
the clinical partner, and the tool in the same hands.

*Risk:* it requires the pilot (Phase 4) to actually run and produce measurements.
Without field data this argument collapses into a description.

### 1b. The safety-architecture argument — publishable sooner, narrower

The assistant enforces grounding **structurally rather than by prompting**:
below a measured retrieval threshold the model is never invoked at all, so it
cannot answer from its own weights. The threshold is empirically calibrated
(`backend/tools/calibrate_threshold.py`), not chosen by feel.

Alongside it, the deterministic clinical logic is implemented twice — once in
TypeScript, once in Python — and locked together by exhaustive parity testing
across the entire input space of every tool. Guidance cannot vary with network
conditions, and the UI tells the clinician which path served their result.

The publishable question is not "we used RAG". It is: **what does it cost, and
what does it buy, to make an LLM clinical assistant structurally incapable of
ungrounded output — and how do you set the threshold defensibly?**

*Search first.* Retrieval-gated refusal is an active area; the specific
contribution here is the *calibration procedure* and the *dual-implementation
determinism guarantee*, and you must confirm neither is already standard.

*Risk:* an engineering-methods contribution. Needs an evaluation — a labelled
set of answerable/unanswerable clinical questions, measured refusal precision
and recall — not just a description. **This evaluation is cheap and can be done
before the pilot**, which makes 1b the natural first paper.

### 1c. The implementation/health-services argument — real but crowded

A locally-hosted, no-PHI, Tennessee-specific decision aid, built with a
community behavioral health partner, addressing the buprenorphine treatment gap
after the federal X-waiver requirement was removed.

*Verify the policy framing before writing:* the waiver requirement was
eliminated by federal legislation in the 2022–2023 window, which shifted the
barrier from regulatory to **knowledge, confidence and workflow**. That shift is
the premise of this whole project — confirm the current statutory and TennCare
position, since state rules and payer policy have continued to move.

*Risk:* implementation-description papers are common and land in lower-impact
venues unless paired with outcome data.

**Recommended sequencing:** 1b first (fastest, self-contained), 1a as the
flagship once the pilot yields data, 1c folded into 1a rather than run alone.

---

## 2. Literature review protocol

Run this **before** committing to a framing. The point is to find out whether
the contribution above is real.

### 2a. Databases

PubMed/MEDLINE · Embase · Web of Science · Scopus · IEEE Xplore · ACM DL ·
arXiv (cs.CL, cs.AI) · Google Scholar (forward citation chasing only)

### 2b. Search strands

Record every query, database, date and hit count in
`docs/research/search-log.md` so the review is reproducible and reportable.

**Strand 1 — clinical decision support for OUD / buprenorphine**
```
(buprenorphine OR "opioid use disorder" OR "medication for opioid use disorder" OR MOUD)
AND ("clinical decision support" OR "decision aid" OR "point of care" OR toolkit)
AND (primary care OR "primary care physician" OR "nurse practitioner")
```

**Strand 2 — provider barriers after waiver removal**
```
(buprenorphine) AND (barrier* OR readiness OR confidence OR "self-efficacy" OR adoption)
AND (waiver OR "X-waiver" OR "DATA 2000" OR deregulation)
```

**Strand 3 — LLM/RAG clinical assistants and their safety**
```
("large language model" OR LLM OR "retrieval augmented generation" OR RAG)
AND (clinical OR medical OR "decision support")
AND (hallucination OR grounding OR abstention OR refusal OR "answer with citations" OR faithfulness)
```

**Strand 4 — abstention / selective prediction**
```
(abstention OR "selective prediction" OR "know what you don't know" OR
 "retrieval confidence" OR "answerability")
AND ("question answering" OR "language model")
```

**Strand 5 — ISE / OR methods in behavioral health capacity**
```
("systems engineering" OR "operations research" OR "system dynamics" OR
 "agent-based model*" OR "discrete event simulation")
AND (opioid OR "substance use" OR "behavioral health" OR "treatment capacity")
```

**Strand 6 — simulation-informed intervention design (closes the 1a loop)**
```
("simulation-based" OR "model-informed" OR "systems model")
AND (intervention design OR implementation OR "decision support")
AND (health OR "public health")
```

**Strand 7 — local/on-premise LLM deployment in healthcare**
```
("on-premise" OR local OR "self-hosted" OR "privacy preserving")
AND ("language model" OR LLM) AND (clinical OR healthcare OR PHI OR HIPAA)
```

### 2c. Screening

PRISMA-style, even for a non-systematic review — it makes the search reportable
and the framing defensible.

1. Title/abstract screen against explicit inclusion criteria.
2. Full-text screen with reasons recorded for every exclusion.
3. Forward + backward citation chasing on the 10–15 most relevant.
4. Extraction table: setting, population, intervention, comparator, outcomes,
   evaluation method, limitations.

### 2d. The question the review must answer

> Has anyone built a **retrieval-gated, deterministic-first clinical decision
> aid for buprenorphine prescribing**, evaluated its **refusal behaviour**, and
> connected it to a **population-level model of the same epidemic**?

If yes → re-frame or find the gap. If no → that is the paper.

---

## 3. Candidate venues

Confirm current scope and turnaround before submitting; these move.

### Industrial & systems engineering / OR
| Venue | Fit |
| --- | --- |
| *IISE Transactions on Healthcare Systems Engineering* | Best fit for the systems argument (1a) |
| *Health Care Management Science* | Modeling + capacity + intervention |
| *Operations Research for Health Care* | Applied OR in a health system |
| *Decision Support Systems* | DSS architecture + evaluation |
| **Winter Simulation Conference** | The lab already publishes here; natural home for the model↔intervention loop |
| IISE Annual Conference | Faster venue for early results |

### Medical informatics
| Venue | Fit |
| --- | --- |
| *JAMIA* | Highest-impact realistic target for 1b/1c |
| *Journal of Biomedical Informatics* | Methods-forward; good for the safety architecture |
| *JMIR* / *JMIR Medical Informatics* | Implementation + digital health, faster |
| *Applied Clinical Informatics* | Practical CDS implementations |
| *npj Digital Medicine* | High bar; needs outcome data |
| **AMIA Annual Symposium** | Strong for 1b; a realistic first submission |

### Addiction / public health
| Venue | Fit |
| --- | --- |
| *Journal of Substance Use and Addiction Treatment* | Direct topical fit |
| *Drug and Alcohol Dependence* | Rigorous, topical |
| *Journal of Addiction Medicine* | Clinician audience |
| *JAMA Network Open* | High impact; needs strong outcomes |
| *Annals of Family Medicine* | The actual target users are primary care |
| *Health Affairs* | Only with a policy angle and real numbers |

### ML/AI venues
Only if 1b's evaluation is rigorous: **ML4H**, **CHIL**, or a clinical-NLP
workshop. A systems/informatics venue is a better fit for this work than a
general ML conference.

---

## 4. What must exist before submission

Nothing publishable can come out of the current state — the toolkit is
unreviewed and unevaluated. In dependency order:

| # | Prerequisite | Gates |
| --- | --- | --- |
| P1 | Clinical review of all 29 content blocks (project-plan Phase 2) | Everything |
| P2 | IRB determination for provider-facing data collection | 1a, 1c |
| P3 | Labelled answerable/unanswerable question set + refusal metrics | **1b only** |
| P4 | Baseline provider measures (confidence, prescribing behaviour) | 1a, 1c |
| P5 | Pilot deployment with measured follow-up | 1a, 1c |
| P6 | Model↔intervention linkage: parameters fed back into the SD/ABM | 1a |

**P3 is the only one that does not depend on the pilot.** That is why 1b is the
first paper — it can be executed on the current system as soon as the content
is reviewed.

**Start P2 now.** IRB is the longest lead-time item in the project and it gates
both field papers.

---

## 5. Funding opportunities

Re-confirm every mechanism against current program announcements — priorities
and numbers change, and some of these are periodically reissued or retired.

### Federal
| Source | Mechanism | Notes |
| --- | --- | --- |
| **NIH / NIDA** | R01, R21 (exploratory), R34 (planning) | Primary home for OUD treatment research. R34/R21 fit a pilot. |
| **NIH HEAL Initiative** | Various | Explicitly targets the opioid crisis; check current open FOAs. |
| **AHRQ** | R18, R21 | Digital healthcare + CDS implementation is a direct fit. |
| **SAMHSA** | State/community grants | More service-delivery than research; a McNabb Center partnership fits. |
| **NSF Smart & Connected Health** | SCH | Fits the systems-engineering + AI framing (1a). |
| **CDC** | Overdose prevention | Surveillance/prevention framing. |
| **PCORI** | Comparative effectiveness | Requires strong patient/stakeholder engagement. |

### State / regional / institutional
- Tennessee Department of Mental Health and Substance Abuse Services
- TennCare quality-improvement and value-based-care initiatives
- UT internal seed funding — the fastest realistic path to pilot money
- UT–ORNL joint programs, if an AI-methods framing is added

### Positioning advice
The strongest proposal narrative is **1a**: *"we have a validated
population-level model of the Tennessee opioid epidemic, we have identified
provider capacity as a leverage point, we have built and deployed the
intervention with a community partner, and we will close the loop by feeding
measured effects back into the model."*

That is a complete systems-engineering story with a real clinical partner and
working software already deployed. Very few applicants can show all four pieces
at submission time — **lead with the working deployment**, since it converts the
usual "we will build" risk into demonstrated capability.

---

## 6. Authorship and ethics

- Agree authorship order **before** drafting. Contribution categories:
  conception, software, clinical content, clinical review, analysis, writing.
- The clinical reviewer(s) will likely warrant authorship — agree this when you
  recruit them, not afterwards.
- McNabb Center collaborators: agree authorship and data-use terms in writing
  early.
- Disclose that clinical content derives from the *All4Knox Clinical Summary
  2026* presentation and confirm permission to build on and publish about it.
- Any provider-facing data collection needs IRB review. Assume yes until an IRB
  tells you otherwise in writing.
- Report the toolkit's limitations honestly, including that content was
  unreviewed at the time of the demo.

---

## 7. Immediate next actions

| # | Action | Owner |
| --- | --- | --- |
| 7.1 | Run Strands 1–4; log every query in `search-log.md` | Gerald |
| 7.2 | Decide whether 1b's contribution survives the search | both |
| 7.3 | Start the IRB determination conversation | Gerald |
| 7.4 | Raise authorship + data use with the McNabb Center | both |
| 7.5 | Build the labelled question set for P3 (~100 answerable + ~100 not) | Gerald |
| 7.6 | Identify a clinical reviewer who may also be an author | Emma |
