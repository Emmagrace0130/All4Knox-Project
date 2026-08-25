# All4Knox Clinical Provider Toolkit — Website Skeleton

> **Working purpose:** A locally hosted, quick-reference clinical toolkit for Tennessee primary care and other clinical providers who are learning to prescribe buprenorphine-naloxone (Suboxone) for opioid use disorder (OUD).

> **Source basis:** Initial clinical content and decision pathways are derived from the uploaded **All4Knox Clinical Summary 2026** presentation. Clinical rules, dosing limits, payer requirements, and referral information should be reviewed and version-controlled before production use.

---

## 1. Product Vision

### Primary Goal
Create an **"easy access" All4Knox toolkit** that lets a Tennessee clinical provider quickly answer practical questions such as:

- Can I prescribe buprenorphine-naloxone for this patient?
- Are there Tennessee-specific prescribing or payer restrictions?
- How should I start buprenorphine based on the patient's recent opioid use?
- What should I do with a positive or unexpected urine drug screen (UDS)?
- How should I adjust the dose when cravings continue?
- When should I increase visit frequency, prescribe naloxone, or refer to a higher level of care?
- Where can I refer a patient for specialty addiction treatment or grant-funded care?

### Intended Users
- Primary care physicians
- Family medicine clinicians
- Internal medicine clinicians
- Nurse practitioners
- Physician assistants
- Other Tennessee clinicians involved in OUD treatment

### Design Principle
The landing page should feel more like a **clinical toolkit/dashboard** than a traditional informational website.

The provider should be able to reach the most important tools in **one click**.

---

# 2. Proposed Technical Stack

## Frontend
- **React**
- **Vite**
- TypeScript recommended
- Responsive desktop/tablet layout
- Optional PWA support later for clinic use

## Backend
- **FastAPI**
- Python
- REST API
- Pydantic models
- Local clinical content/data store
- Optional PostgreSQL or SQLite depending on scale

## Local Infrastructure
- Run on the local GPU/server environment
- Dockerized services recommended
- No cloud dependency required for core clinical tools
- Local LLM/GPU services can be added for future search, summarization, or provider Q&A

## Proposed Service Layout

```text
Browser
   |
   v
React + Vite Frontend
   |
   v
FastAPI Backend
   |
   +-- Clinical Decision Rules
   +-- Tennessee Prescribing Rules
   +-- UDS Interpretation Logic
   +-- Referral Directory
   +-- Clinical Resource Library
   +-- Local Search / Optional Local LLM
   |
   v
Local Database / JSON / Markdown Content
```

---

# 3. Domain / Deployment Note

The requested address was:

```text
All4Knox@rubyrecon.com
```

An `@` is normally used in an **email address**, not a web domain.

A likely website address would instead be something like:

```text
all4knox.rubyrecon.com
```

or

```text
rubyrecon.com/all4knox
```

**Working website URL for this skeleton:**

```text
https://all4knox.rubyrecon.com
```

Confirm the final hostname before deployment.

---

# 4. Main Navigation

Keep the top navigation short.

```text
[All4Knox Logo]

Toolkit
Start Suboxone
UDS Interpreter
Dosing
TN Prescribing
Referrals
Resources
About
```

For the first version, the **Toolkit** page should also function as the landing page.

---

# 5. Landing Page — "All4Knox Toolkit"

## Route

```text
/
```

## Goal
Give providers immediate access to the main clinical workflows.

## Header

```text
All4Knox
Clinical Buprenorphine Toolkit

Quick Tennessee-specific guidance for clinicians treating opioid use disorder.
```

## Primary Toolkit Cards

### 1. Can I Prescribe?
**Purpose:** Determine prescribing pathway based on insurance and clinician type.

Button:

```text
Check Prescribing Pathway
```

---

### 2. Start Suboxone
**Purpose:** Select an induction pathway based on recent opioid exposure.

Button:

```text
Choose Induction Method
```

---

### 3. Interpret a UDS
**Purpose:** Help the clinician respond to BUP, fentanyl, methamphetamine, cocaine, opioid, oxycodone, or methadone findings.

Button:

```text
Interpret UDS
```

---

### 4. Dose & Cravings
**Purpose:** Review maintenance dose guidance and next steps when cravings continue.

Button:

```text
Review Dosing
```

---

### 5. Find Treatment / Refer
**Purpose:** Show Tennessee and Knoxville-area higher-level-of-care, specialty, and grant-funded options.

Button:

```text
Find Referral Options
```

---

### 6. Quick Clinical Resources
**Purpose:** Provide printable guides, patient education, naloxone information, and external clinical resources.

Button:

```text
Open Resources
```

---

## Optional "Quick Start" Section

```text
What do you need help with?

[ I am starting a new patient ]
[ My patient has an unexpected UDS ]
[ My patient is still having cravings ]
[ I need a referral ]
[ I need TN prescribing information ]
```

Each button routes the provider directly to the relevant tool.

---

# 6. Tool: Tennessee Prescribing Pathway

## Route

```text
/toolkit/prescribing
```

## Source Content
Based on the prescribing decision tree in the uploaded presentation.

The presentation separates patients into:

- Insured
  - Private insurance
  - TennCare
- Uninsured

It also separates prescribing pathways by:

- MD/DO
- NP/PA
- BESMART enrollment status
- Non-BESMART status

## Proposed UI

### Step 1 — Patient Coverage

```text
What insurance does the patient have?

( ) Private insurance
( ) TennCare
( ) Uninsured
```

### Step 2 — Prescriber Type

```text
What type of clinician are you?

( ) MD / DO
( ) NP / PA
```

### Step 3 — TennCare Provider Status

Only show when TennCare is selected.

```text
Are you a BESMART-enrolled prescriber?

( ) Yes
( ) No
```

### Result Card

Example:

```text
Your Prescribing Pathway

TennCare
BESMART Enrolled
MD/DO

- No prior authorization required according to the current All4Knox summary.
- Prescription duration: up to 30 days.
- Current summary lists a maximum dose of 20 mg, or 24 mg with addiction consultation.

[View Source]
[Print]
```

## Uninsured Result

```text
Consider referral to a grant-funded clinic.

Initial All4Knox resources:
- McNabb
- Cherokee
```

---

# 7. Tool: Start Suboxone / Induction Decision Aid

## Route

```text
/toolkit/start
```

## Intro

```text
Initiation of Buprenorphine-Naloxone

1. Confirm the patient meets criteria for OUD.
2. Confirm the patient agrees to buprenorphine-naloxone maintenance.
3. Select an induction pathway based on recent opioid exposure and tolerance.
```

The uploaded presentation emphasizes avoiding **precipitated withdrawal** when choosing an induction method.

## Step 1 — Current Patient Situation

```text
Which best describes the patient?

[ Current fentanyl use ]
[ Current prescription opioid use ]
[ Opioid-negative with history of OUD ]
[ Already taking Suboxone ]
[ Transitioning from methadone ]
```

## Step 2 — UDS / Recent Use

Show context-specific questions.

Examples:

### Fentanyl

```text
Is fentanyl present on UDS?

[ Yes ]
[ No / Unknown ]

How long has it been since the patient's last use?
[ <24 hours ]
[ 24+ hours ]
```

### Prescription Opioid

```text
Is oxycodone or another opioid present on UDS?

[ OXY positive ]
[ OPI positive ]
[ Negative ]
```

## Step 3 — Guidance Result

The tool should present the corresponding induction pathway from the clinical summary.

### Important UX Requirement

Do **not** present induction guidance as an unlabeled calculator result.

Every result should show:

```text
Clinical Decision Support
Not a substitute for clinician judgment.

Source: All4Knox Clinical Summary
Last reviewed: [DATE]
```

## High-Risk / Escalation Banner

The presentation identifies circumstances where the clinician should consider a **higher level of care / inpatient detox**.

Use a visually prominent alert:

```text
Consider Higher Level of Care
This patient's current opioid exposure or induction risk may warrant specialty addiction consultation or inpatient management.
```

---

# 8. Tool: UDS Interpreter

## Route

```text
/toolkit/uds
```

## Goal
Convert the presentation's UDS flowcharts into a fast interactive tool.

## Input

```text
Select all substances detected:

[ ] BUP — Buprenorphine
[ ] FENT — Fentanyl
[ ] OPI — Opiates
[ ] OXY — Oxycodone
[ ] MTD — Methadone
[ ] MET — Methamphetamine
[ ] COC — Cocaine
[ ] Other
```

## Example Logic

### BUP Positive Only

```text
Interpretation:
Expected result for a patient taking prescribed buprenorphine.

Suggested response:
- Continue buprenorphine treatment.
```

### BUP Negative

```text
Interpretation:
The patient may not be taking prescribed buprenorphine.

Consider:
- Difficulty initiating treatment
- Diversion
- Ongoing opioid exposure
- Other barriers
```

### BUP Positive + Stimulant Positive

```text
Interpretation:
Patient appears to be taking buprenorphine and also using a stimulant.

Suggested response from current All4Knox summary:
- Continue buprenorphine for OUD.
- Address stimulant use.
- Increase follow-up frequency when appropriate.
```

### BUP Positive + Fentanyl Positive

```text
Interpretation:
Patient appears to be taking buprenorphine with continued opioid use.

Consider:
- Continue buprenorphine.
- Assess ongoing opioid cravings.
- Consider dose adjustment when clinically appropriate.
- Increase visit frequency / close follow-up.
- Naloxone prescription or access.
- Consider higher level of care when needed.
```

### BUP Negative + Fentanyl Positive

```text
Interpretation:
Patient is not showing buprenorphine on UDS and has evidence of ongoing fentanyl exposure.

Consider:
- Whether the patient has been unable to initiate buprenorphine.
- Risk of precipitated withdrawal.
- Rapid induction guidance from the current clinical pathway.
- Higher level of care when appropriate.
```

---

# 9. Tool: Maintenance Dosing

## Route

```text
/toolkit/dosing
```

## Main Content

```text
Buprenorphine Maintenance Dosing

Primary treatment goal:
Control opioid cravings and reduce relapse risk.
```

## Current Summary Highlights

From the uploaded All4Knox presentation:

- Dose should be titrated to control cravings.
- The presentation identifies **16 mg/day** as a common standard dose.
- A common divided schedule is **8 mg twice daily**.
- Once-daily dosing may also be used depending on patient preference.
- The presentation notes FDA-labeled dosing of **8–24 mg/day**.
- Tennessee-specific prescribing limits and provider-type restrictions should be displayed through the separate TN Prescribing tool and maintained as version-controlled content.

## Provider Prompt

```text
Is the patient continuing to experience opioid cravings?

[ No ]
[ Yes ]
```

If yes:

```text
Consider whether dose adjustment is clinically appropriate.

Also review:
- Current dose
- Adherence
- UDS
- Continued opioid exposure
- Sedating co-substances
- Need for addiction specialty consultation
```

---

# 10. Clinical Education: Buprenorphine-Naloxone Basics

## Route

```text
/learn/buprenorphine
```

## Sections

### What is Suboxone?

```text
Suboxone is a combination of:
- Buprenorphine
- Naloxone
```

### Buprenorphine

Explain that buprenorphine is the medication component responsible for treatment of OUD.

### Naloxone

The source presentation explains that naloxone has limited sublingual absorption and is included to discourage injection misuse.

### Precipitated Withdrawal

Provide a simple graphic explaining:

```text
Full opioid agonist on receptor
        ↓
Buprenorphine has high receptor affinity
        ↓
Buprenorphine displaces the full agonist
        ↓
Partial receptor activation
        ↓
Abrupt withdrawal symptoms may occur
```

This section should link directly to the induction tool.

---

# 11. Referrals / Higher Level of Care

## Route

```text
/referrals
```

## Search Filters

```text
Location:
[ Knoxville ]
[ East Tennessee ]
[ Tennessee ]

Patient Coverage:
[ Private ]
[ TennCare ]
[ Uninsured ]

Need:
[ Addiction specialist ]
[ Inpatient detox ]
[ Outpatient OUD treatment ]
[ Grant-funded treatment ]
[ Psychiatry ]
[ Counseling ]
[ Recovery support ]
```

## Initial Organizations Mentioned in the Presentation

The clinical summary references:

- McNabb
- Cherokee / River Valley
- ReVida
- Cedar Recovery

These should be maintained in a structured directory rather than hard-coded throughout the frontend.

## Suggested Data Fields

```yaml
name:
organization_type:
address:
county:
phone:
website:
accepts_tenncare:
accepts_private:
uninsured_options:
grant_funded:
services:
mat_available:
detox_available:
notes:
last_verified:
```

---

# 12. Resources Tab

## Route

```text
/resources
```

## Suggested Sections

### All4Knox Quick Guides
- Starting buprenorphine
- Rapid induction reference
- UDS interpretation
- Dosing and cravings
- Tennessee prescribing pathway
- When to refer

### Patient Handouts
- What is buprenorphine-naloxone?
- How to take sublingual medication
- What is precipitated withdrawal?
- Naloxone / overdose response
- What to expect at follow-up visits

### Clinical Forms
- OUD intake checklist
- Follow-up checklist
- UDS review template
- Treatment agreement template
- Referral form

### External Clinical Resources
Potential future links could include:
- SAMHSA
- FDA
- Tennessee Department of Mental Health and Substance Abuse Services
- TennCare
- ASAM resources
- PCSS / buprenorphine education resources

External links should be reviewed before production deployment.

---

# 13. Additional Tool Tabs Worth Including

These are useful additions for primary care providers learning to prescribe buprenorphine.

## A. OUD Diagnosis Helper

```text
/toolkit/oud-diagnosis
```

Simple DSM-based checklist with a reminder that diagnosis remains a clinician determination.

---

## B. COWS Calculator

```text
/toolkit/cows
```

Interactive Clinical Opiate Withdrawal Scale calculator.

Useful because withdrawal severity may influence timing of traditional buprenorphine induction.

---

## C. Precipitated Withdrawal Guide

```text
/toolkit/precipitated-withdrawal
```

A concise tool covering:

- What it is
- Why it happens
- Common warning signs
- Prevention
- Escalation / higher level of care

---

## D. Naloxone Quick Guide

```text
/toolkit/naloxone
```

Include:

- When to prescribe/recommend naloxone
- Patient counseling
- Family/caregiver counseling
- Overdose response steps
- Tennessee access information

---

## E. Medication Interaction / Sedation Check

```text
/toolkit/safety
```

Provider selects common co-exposures and receives safety reminders.

Examples:

- Alcohol
- Benzodiazepines
- Other sedatives
- Other opioids

This should provide safety information rather than a simple "safe / unsafe" result.

---

## F. Follow-Up Visit Checklist

```text
/toolkit/follow-up
```

Example:

```text
[ ] Current buprenorphine dose
[ ] Adherence
[ ] Cravings
[ ] Withdrawal symptoms
[ ] Continued opioid use
[ ] Other substance use
[ ] UDS reviewed
[ ] Naloxone access
[ ] Side effects
[ ] Psychosocial barriers
[ ] Need for higher level of care
[ ] Follow-up interval
```

---

## G. Tennessee Referral Finder

```text
/toolkit/referral-finder
```

Could eventually use county, payer, treatment type, and distance to match patients to services.

---

# 14. Suggested Route Map

```text
/
├── /toolkit
│   ├── /prescribing
│   ├── /start
│   ├── /uds
│   ├── /dosing
│   ├── /oud-diagnosis
│   ├── /cows
│   ├── /precipitated-withdrawal
│   ├── /naloxone
│   ├── /safety
│   ├── /follow-up
│   └── /referral-finder
│
├── /learn
│   ├── /buprenorphine
│   ├── /induction
│   ├── /uds
│   └── /tennessee-rules
│
├── /referrals
├── /resources
├── /about
└── /clinical-sources
```

---

# 15. Frontend Component Skeleton

```text
src/
├── app/
│   ├── router.tsx
│   └── App.tsx
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   ├── Footer.tsx
│   │   └── PageContainer.tsx
│   │
│   ├── toolkit/
│   │   ├── ToolkitCard.tsx
│   │   ├── DecisionStep.tsx
│   │   ├── ResultCard.tsx
│   │   ├── ClinicalAlert.tsx
│   │   └── SourceBadge.tsx
│   │
│   ├── forms/
│   │   ├── RadioGroup.tsx
│   │   ├── CheckboxGroup.tsx
│   │   └── Select.tsx
│   │
│   └── common/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       └── Search.tsx
│
├── pages/
│   ├── ToolkitHome.tsx
│   ├── PrescribingTool.tsx
│   ├── StartSuboxoneTool.tsx
│   ├── UDSInterpreter.tsx
│   ├── DosingTool.tsx
│   ├── ReferralDirectory.tsx
│   ├── Resources.tsx
│   ├── About.tsx
│   └── ClinicalSources.tsx
│
├── api/
│   └── client.ts
│
├── hooks/
├── types/
└── assets/
```

---

# 16. FastAPI Backend Skeleton

```text
backend/
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   ├── prescribing.py
│   │   ├── induction.py
│   │   ├── uds.py
│   │   ├── dosing.py
│   │   ├── referrals.py
│   │   └── resources.py
│   │
│   ├── models/
│   │   ├── prescribing.py
│   │   ├── induction.py
│   │   ├── uds.py
│   │   └── referral.py
│   │
│   ├── services/
│   │   ├── prescribing_rules.py
│   │   ├── induction_rules.py
│   │   ├── uds_rules.py
│   │   └── referral_search.py
│   │
│   ├── data/
│   │   ├── clinical_rules.yaml
│   │   ├── tn_prescribing_rules.yaml
│   │   ├── uds_rules.yaml
│   │   └── referrals.json
│   │
│   └── core/
│       ├── config.py
│       └── versioning.py
│
├── tests/
├── requirements.txt
└── Dockerfile
```

---

# 17. Example API Endpoints

```http
GET  /api/health
GET  /api/content/version

POST /api/prescribing/evaluate
POST /api/induction/evaluate
POST /api/uds/interpret
POST /api/dosing/review

GET  /api/referrals
GET  /api/referrals/{id}

GET  /api/resources
GET  /api/sources
```

---

# 18. Example UDS Request

```json
{
  "buprenorphine": true,
  "fentanyl": true,
  "methamphetamine": false,
  "cocaine": false,
  "opiates": false,
  "oxycodone": false,
  "methadone": false
}
```

## Example Response Shape

```json
{
  "interpretation": "Buprenorphine present with continued fentanyl exposure.",
  "actions": [
    "Continue buprenorphine treatment.",
    "Assess ongoing opioid cravings.",
    "Consider dose adjustment when clinically appropriate.",
    "Use frequent follow-up when indicated.",
    "Confirm naloxone access."
  ],
  "escalation": "Consider higher level of care when clinically indicated.",
  "source_id": "all4knox-clinical-summary-2026",
  "content_version": "2026.1"
}
```

---

# 19. Clinical Content Architecture

Clinical guidance should **not be hard-coded directly into React components**.

Store clinical rules separately so they can be reviewed and updated without rebuilding the whole user interface.

Example:

```yaml
rule_id: uds_bup_fent
title: BUP Positive + FENT Positive
interpretation: >
  Patient appears to be taking buprenorphine with continued opioid exposure.
actions:
  - Continue buprenorphine.
  - Assess cravings.
  - Consider clinically appropriate dose adjustment.
  - Increase follow-up when needed.
  - Confirm naloxone access.
escalation:
  - Consider higher level of care when appropriate.
source:
  document: All4Knox Clinical Summary 2026
  slide: 7
review:
  reviewed_by:
  reviewed_date:
  expires_date:
```

---

# 20. Clinical Source / Version Control Page

## Route

```text
/clinical-sources
```

Every clinical module should identify:

- Source document
- Source organization or author
- Clinical reviewer
- Date reviewed
- Effective date
- Next review date
- Current content version
- Superseded versions

Example:

```text
All4Knox Clinical Guidance
Version: 2026.1
Last Clinical Review: [DATE]
Next Scheduled Review: [DATE]
```

This is especially important for:

- Tennessee prescribing restrictions
- TennCare requirements
- Prior authorization
- Dose limits
- BESMART requirements
- Referral information

---

# 21. Safety / Clinical Governance

Because this platform provides clinical decision support, the UI should clearly distinguish between:

### Educational Content
General background and learning materials.

### Clinical Decision Support
Structured guidance based on provider-entered information.

### Emergency / High-Risk Situations
A clear escalation message.

Example:

```text
This toolkit does not provide emergency medical care.

For suspected overdose, severe withdrawal, respiratory depression,
or another medical emergency, follow your organization's emergency
protocol and obtain immediate medical assistance.
```

## Required Content Features

- Date/version on every clinical algorithm
- Link to source
- Clinical reviewer
- No silent rule changes
- Audit trail for changes
- Visible disclaimer
- No patient-identifying information required for basic tools

---

# 22. Privacy Strategy

For the first release, design the toolkit so the user does **not need to enter PHI**.

Avoid fields for:

- Patient name
- DOB
- Address
- Medical record number
- Phone
- Email

The decision tools should use only the minimum clinical variables needed to provide the guidance.

This keeps the first version simpler and reduces privacy risk.

---

# 23. Local GPU / Local AI Expansion

The initial website does **not require AI** to perform the decision trees.

Rule-based clinical logic is preferable for the first release because it is:

- deterministic
- testable
- version-controlled
- clinically reviewable

The local GPU can later support optional features such as:

## "Ask All4Knox"

```text
Ask a clinical workflow question:
"How should I interpret BUP + FENT on today's UDS?"
```

The local model should retrieve answers only from approved All4Knox clinical content.

Suggested architecture:

```text
Provider Question
      |
      v
Local Retrieval
      |
      v
Approved All4Knox Knowledge Base
      |
      v
Local LLM
      |
      v
Answer + Clinical Source + Version
```

The AI assistant should **not replace** the deterministic decision tools.

---

# 24. Recommended MVP

## Phase 1

Build these first:

1. Toolkit landing page
2. Tennessee prescribing pathway
3. Start Suboxone / induction tool
4. UDS interpreter
5. Maintenance dosing page
6. Referral directory
7. Clinical sources/version page

## Phase 2

Add:

- COWS calculator
- OUD diagnosis helper
- Naloxone guide
- Follow-up checklist
- Printable resources
- Search

## Phase 3

Add:

- Local "Ask All4Knox" assistant
- County-based referral matching
- Provider favorites
- Offline/PWA mode
- Clinical content administration panel

---

# 25. MVP Landing Page Wireframe

```text
┌───────────────────────────────────────────────────────────────┐
│ All4Knox                                      Resources About │
│ Clinical Buprenorphine Toolkit                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Practical OUD treatment guidance for Tennessee clinicians   │
│                                                               │
│  What do you need help with today?                           │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│  │ CAN I PRESCRIBE │  │ START SUBOXONE  │  │ INTERPRET UDS │ │
│  └─────────────────┘  └─────────────────┘  └───────────────┘ │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│  │ DOSE & CRAVINGS │  │ FIND A REFERRAL │  │ QUICK GUIDES  │ │
│  └─────────────────┘  └─────────────────┘  └───────────────┘ │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ Clinical Guidance Version 2026.1 | Last Reviewed: [DATE]     │
└───────────────────────────────────────────────────────────────┘
```

---

# 26. Design Direction

The visual design should feel:

- Clinical
- Calm
- Fast
- Modern
- Trustworthy
- Minimal
- Easy to scan during a patient visit

Avoid making the site look like:

- A research paper
- A hospital intranet
- A large public-health portal
- A chatbot-first application

The primary experience is the **toolkit**.

The user should see the most important actions immediately.

---

# 27. Key Development Principle

The website should follow this hierarchy:

```text
FAST TOOL
   ↓
SHORT ANSWER
   ↓
NEXT CLINICAL ACTIONS
   ↓
OPTION TO READ MORE
   ↓
SOURCE + VERSION
```

Do not force a busy clinician to read a long educational article before reaching the clinical workflow.

---

# 28. Immediate Build Target

The first development milestone should be:

```text
All4Knox Toolkit Landing Page
        +
Tennessee Prescribing Pathway
        +
Induction Decision Aid
        +
UDS Interpreter
```

These three tools represent the most actionable workflows in the current clinical summary and create the core structure for the rest of the platform.
