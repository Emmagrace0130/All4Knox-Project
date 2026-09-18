# Source Extraction — All4Knox Clinical Summary 2026

What was transcribed from the source presentation into
[`frontend/src/content/`](../frontend/src/content/), and where each piece came
from. Kept for the audit trail required by §20–§21 of the website skeleton
("link to source", "no silent rule changes").

**Source file:** `All4Knox_ClinicalSummary_2026 (1) (1).pptx` (12 slides)
**Content version:** 2026.1
**Extracted:** 2026-08-25
**Clinically reviewed:** no

Six of the decision trees are PowerPoint SmartArt diagrams
(`ppt/diagrams/data1–6.xml`), not slide text, so their structure comes from the
diagrams' `parOf` connection lists rather than from reading the slides.

## Slide map

| Slide | Content | Encoded in |
| --- | --- | --- |
| 1 | Title | — |
| 2 | Prescribing decision tree (SmartArt) | `content/prescribing.ts` |
| 3 | Initiation preconditions (SmartArt) | `content/induction.ts` |
| 4 | Five induction situations + methods + star legend | `content/induction.ts` |
| 5 | Induction timing tree (SmartArt) | `content/induction.ts` |
| 6 | Follow-up UDS response tree (SmartArt) | `content/uds.ts`, `content/induction.ts` |
| 7 | UDS interpretation table (SmartArt) | `content/uds.ts` |
| 8 | Buprenorphine-naloxone basics | `content/learn.ts` |
| 9 | Safety and precipitated withdrawal | `content/learn.ts` |
| 10 | Section divider | — |
| 11 | Suboxone dosing, TN limits, referral options | `content/dosing.ts`, `content/referrals.ts` |
| 12 | UDS at each appointment | `content/uds.ts` |

## Slide 2 — prescribing tree

```
Person with OUD, >18yo
├── Insured
│   ├── Private
│   │   ├── MD/DO ............... Can Rx up to 30d, max 20mg or 24mg w/ addiction consult
│   │   └── NP/PA * ............. Can Rx up to 30d, max 16mg
│   └── TennCare
│       ├── Non-BESMART Provider  Prior Authorization Required → Limit to 16mg
│       └── BESMART Enrolled ..... No Prior Authorization Required
│           ├── MD/DO ........... Can Rx up to 30d, max 20mg or 24mg w/ addiction consult
│           └── NP/PA * ......... Can Rx up to 30d, max 16mg
└── Uninsured ................... Refer to Grant Funded Clinic: McNabb or Cherokee

* NP/PA must work at FQHC, CMHC, OBOT, or Hospital
```

Note the tree branches on BESMART status *before* prescriber type, so the
non-BESMART outcome is the same for MD/DO and NP/PA.

**Changed in content version 2026.2 (2026-09-15) — no longer a faithful
transcription of this slide for TennCare.** The TennCare MD/DO limits now
follow TennCare's BESMART Provider Education of May 28, 2026 (slides 4–5):
BESMART MD/DO 32 mg for preferred products without prior authorization;
non-BESMART MD/DO 16 mg without PA, up to 32 mg with it. The non-BESMART branch
is split by prescriber type, and NP/PA keeps this slide's outcome. Each changed
pathway cites the TennCare deck and shows this slide's figure beside it. The
decision is Gerald's, pending Dr. Alexander's confirmation (9/18 agenda). The
private-insurance branches remain exactly as above.

## Slide 4 — induction methods, and the star legend

Five columns, each a patient situation with its method underneath:

| Situation | Method |
| --- | --- |
| Patient using Fentanyl (UDS + FENT) ★ | Wait at least 24 hrs from last use → 1/8 of film every hr × 8 hrs → then 8mg BID |
| Prescription Opioid (UDS + OXY or OPI) | If oxy wait 12 hrs then start maintenance 8mg BID |
| Opioid Negative, hx of OUD (UDS neg OPI/FENT/OXY/MTD) | Start lower than typical due to opioid naïve state → start 4mg daily |
| Already on Suboxone (UDS + BUP) | Continue standard dosing |
| Transitioning from Methadone ★ | Taper methadone below 40mg daily → wait 24 hrs → start 1/8 film every hour × 8 |

**★ = "Consider Inpatient Detox."** This is a legend, not a caption: a star
shape plus the text box sit together at the top-left of the slide (x≈0.17–0.73,
y≈0.08), and two further star shapes badge the top-right corners of the
fentanyl column (x≈2.69) and the methadone column (x≈11.86). Column/text-box
pairings were confirmed by matching shape centre-x against the SmartArt node
positions in `drawing3.xml`, not by reading order.

## Slide 5 — induction timing tree

```
Person with OUD, >18yo
├── Current Illicit Opioid Use (FENT + UDS)
│   └── >24hrs since last use
│       └── Start 1mg BUP every hour x 8 hrs (rapid low dose induction)
│           └── Then start BUP maintenance
└── Current Rx Opioid Use (OXY + UDS)
    └── >24 Hrs since last dose
        └── Start BUP maintenance immediately
```

### Known discrepancy — flagged in the UI, not resolved

Slide 4 says **"If oxy wait 12 hrs then start maintenance 8mg BID."**
Slide 5 branches on **">24 Hrs since last dose"** before starting maintenance
immediately.

These give different intervals for the same situation. Both are reproduced with
their own slide reference, and each result card carries a note asking the
clinician to confirm which applies. This is deliberately **not** reconciled in
code — it needs a clinical decision.

## Slide 6 — follow-up UDS response

```
Person with OUD on Suboxone MAT, F/u Appt
└── UDS each appt
    ├── Expected: UDS + BUP only
    │   └── Continue BUP
    ├── UDS + For FENT only (pt not taking BUP: unable to start vs. diversion vs. other)
    │   ├── Advise pt to wait 24hrs then rapid induction / Frequent appt, close f/u / Narcan Rx
    │   └── Consider HLOC (inpatient detox)
    ├── UDS + for BUP and MET (methamphetamine use)
    │   └── Continue BUP / Consider Wellbutrin if meth cravings / Freq appts while using meth
    └── UDS + for BUP and FENT (Ongoing opioid use)
        └── Continue BUP / Consider dose increase if ongoing opioid cravings / Frequent appt, close f/u / Narcan Rx
```

## Slide 7 — UDS interpretation

| Pattern | Interpretation | Response |
| --- | --- | --- |
| BUP + | Appropriate | — |
| BUP − | Not taking prescribed suboxone | Concern for diversion |
| BUP+, MET/COC+ | Taking Suboxone and using stimulant | Continue suboxone for OUD and address stimulant use |
| BUP+, FENT\*+ | Taking Suboxone and continued opioid use | Consider higher dose if ongoing cravings. Or HLOC |
| BUP −, FENT\*+ | Not taking Suboxone, ongoing opioid use | Consider HLOC vs patient unable to start BUP due to concern for PW |

**`*FENT or other opioid`** — the slide's own footnote. The two FENT rows
therefore match any opioid positive (FENT, OPI, OXY or MTD), which is why
`content/uds.ts` matches on `anyOpioid` rather than fentanyl alone.

One consequence worth a reviewer's attention: a methadone-positive screen in a
patient transitioning from methadone will match the opioid rules. The footnote
supports this reading, but the presentation does not carve out an exception.

## Slide 11 — dosing

- Dose titrated to control cravings; cravings are subjective but predict relapse risk.
- Standard dose **16 mg/day**, often **8 mg BID**, can be once daily (patient preference).
- FDA label: **8–24 mg/day**.
- Tennessee: an "arbitrary" limit of **16 mg for NPs/PAs** and **20 mg for most physicians** unless addiction specialists. Not true in most other states.
- Above those limits → refer to addiction treatment specialist: McNabb, Cherokee/River Valley, ReVida, Cedar Recovery **"etc."**

The trailing "etc." is why the referral directory states it is not exhaustive.

## What the presentation does not contain

- Addresses, phone numbers, websites or payer acceptance for any referral
  organisation. These remain `null` and render as "not yet verified".
- Any clinical reviewer, review date or effective date.
- Patient handouts, clinical forms or external resource links.

## Reproducing this extraction

The slide text, SmartArt trees and shape geometry were read directly from the
Office Open XML parts:

- `ppt/slides/slideN.xml` — slide text and shape positions
- `ppt/diagrams/dataN.xml` — SmartArt nodes (`dgm:pt`) and hierarchy (`dgm:cxn` where `type` is absent, i.e. `parOf`)
- `ppt/diagrams/drawingN.xml` — rendered node positions, used to pair slide 4's text boxes with their columns
