# All4Knox — Compliance & Hosting Readiness Plan

**Why this exists:** at the 2026-09-18 meeting, Dr. Alexander said the McNabb
Center has its own internal process for approving an externally hosted
application for staff use — separate from, and in addition to, clinical
content review (`/review`, [`clinical-review-plan.md`](clinical-review-plan.md))
and any IRB determination for research use of provider data
([`project-plan.md`](project-plan.md) Phase 4.2,
[`research/publication-plan.md`](research/publication-plan.md)). We do not yet
have McNabb's actual checklist. This document is where it goes once we do,
and in the meantime it's a self-assessment against the categories that kind
of review typically covers, so we're answering from evidence instead of
scrambling when the real list arrives.

**Status: pending.** McNabb's team was going to describe this process
internally; the specifics belong in
[`meeting_notes/mcnabb_meeting_9_18_26_notes.md`](meeting_notes/mcnabb_meeting_9_18_26_notes.md)
§7, and a summary of what's actually required replaces §2 below once known.

---

## 1. The three gates, and why they're not the same thing

It's easy to conflate these. They have different owners, different questions,
and different timelines.

| Gate | Question it answers | Owner | Where it lives |
| --- | --- | --- | --- |
| **Clinical content review** | Is the guidance itself correct? | A named clinician (Dr. Alexander or his nominee) | [`clinical-review-plan.md`](clinical-review-plan.md), `/review` |
| **McNabb hosting/compliance approval** | Can McNabb staff use software we host, given their data-handling and security requirements? | McNabb's internal team (IT/compliance — names TBD) | **This document** |
| **IRB determination** | Is provider data collection for research human-subjects research, and if so, under what protocol? | Institutional IRB | [`project-plan.md`](project-plan.md) Phase 4.2, [`research/publication-plan.md`](research/publication-plan.md) |

A pilot needs all three. None substitutes for another — content can be
reviewed and still fail a hosting review over, say, session-cookie handling;
hosting can be approved and the IRB can still require a separate consent
process for the same cohort.

---

## 2. What McNabb actually requires — fill in after the meeting

| Question | Answer | Source |
| --- | --- | --- |
| Who runs the review — a named person or committee? | *pending* | |
| Is there a written checklist or questionnaire (e.g. a security/vendor risk form)? | *pending* | |
| Required certifications or attestations (SOC 2, HITRUST, a state security addendum)? | *pending* | |
| Data residency / hosting location requirements? | *pending* | |
| Is a Business Associate Agreement required, given the app stores no PHI by design? | *pending* | |
| Expected turnaround time? | *pending* | |
| Does this run in parallel with clinical review, or does one gate the other? | *pending* | |

Update this table from the 9/18 notes, and re-check the self-assessment in
§3 against whatever criteria actually show up here — the categories below are
an educated guess, not a substitute for McNabb's real list.

---

## 3. Self-assessment — what we can already show, and where

| Category | Current state | Evidence |
| --- | --- | --- |
| **Transport encryption** | Public site is HTTPS-only, single SAN cert (all4knox.axiomsystemslab.com + all4knox.rubyrecon.com), auto-renewed via acme-companion | `docker-compose.yml`, [`session-handoff.md`](session-handoff.md) §5 |
| **Network exposure** | API container is not on the shared public network; reachable only via nginx `/api` proxy on the same origin — no separate public DNS name for the API | [`session-handoff.md`](session-handoff.md) §2 architecture diagram |
| **Authentication & access control** | Cookie-based sessions (httponly, `Secure`, `SameSite=lax`); four roles (visitor/basic/clinician/admin) enforced server-side per endpoint; no self-service sign-up — accounts are admin-created | `backend/app/api/deps.py`, `backend/app/services/auth.py` |
| **PHI / data classification** | The toolkit and assistant are designed to need no patient-identifying information (skeleton §22); the UI warns against entering it. **Not yet enforced server-side** — a user could still paste PHI into a conversation, and it would be stored in SQLite as typed. | `docs/accounts-and-assistant-plan.md` §6, open risk #1 |
| **Audit logging** | Clinical review actions are append-only and hash-bound to the reviewed text (a review is invalidated if the content changes); no general request/access audit log yet | [`clinical-review-plan.md`](clinical-review-plan.md) |
| **Data retention / deletion** | Visitor sessions and their conversations are deleted after 2 hours idle; signed-in sessions expire after 30 days; no documented retention policy for account or review data | `backend/app/core/config.py` (`visitor_session_ttl_minutes`, `account_session_ttl_days`) |
| **Backups** | **None currently.** SQLite file on a Docker volume; nothing scheduled | `project-plan.md` 5.4 |
| **Availability / support during a pilot** | No on-call or incident-response process defined yet | `project-plan.md` 4.7 |
| **Rate limiting / abuse protection** | **Absent.** The assistant endpoint is public and consumes shared GPU; a shared URL beyond the demo audience is a real risk | `project-plan.md` 5.6, known blocker |
| **Regulatory classification** | Positioned throughout as clinical **decision support**, not diagnosis or treatment-authority software; every result is labelled as such (`decisionSupportLabel`/`decisionSupportNote`) and unreviewed content says so on every page | `frontend/src/content/governance.ts`, `/api/sources` |
| **Vendor / subprocessor list** | Ollama runs on the same host we control (no external LLM API call); no third-party data processor in the current architecture | `session-handoff.md` §2 |
| **Accessibility** | Not yet assessed against WCAG or similar | — |

**Read this table honestly, not optimistically.** The gaps (no server-side PHI
enforcement, no backups, no rate limiting, no audit log, no documented
retention policy) are real and are already tracked as blockers B3/B5 and
Phase 5 items — this document doesn't invent new work, it collects existing
gaps under the lens McNabb's review will likely use.

---

## 4. Clinician pilot testing and the feedback survey

This is Phase 4.5 (`project-plan.md`) and the 9/1 backlog's "survey tab" ask,
tied together here because both depend on the same rollout gate (§1) clearing
first.

**Sequencing:** clinical content review substantially complete → McNabb
hosting approval granted → pilot cohort defined (4.1) → clinicians test →
survey.

**Draft survey scope** (to refine with Dr. Alexander, not to finalize
unilaterally):

- Does each tool's recommendation match what you would have done anyway?
- Did any result surprise you, and was that surprise warranted or a defect?
- Time to get an answer, compared to your current reference method
- Trust in the assistant's citations — did you check them, and did they hold up?
- Anything you needed that wasn't there
- Would you use this again / recommend it to a colleague

**Format, fastest path first:** an external form (e.g. a shared survey tool)
for the initial pilot, rather than waiting on the in-app survey tab
(9/1 backlog, not started) — don't let unbuilt UI delay getting real feedback.
Revisit building it in-app once the pilot shows the survey is used enough to
be worth the engineering.

**Owner:** Gerald/Emma to draft the instrument; Dr. Alexander (or his
nominee) to review it for clinical framing before it goes to any provider.

### 4.1 Planned guided clinic-readiness workflow

The existing TurboTax-style flows are patient-care tools: prescribing,
induction, UDS, and dosing. They should be enriched with approved clinical
checklist details only where those details explain or change a result. They
should not become clinic implementation checklists.

The readiness documents support a separate guided workflow, proposed at
`/implementation/readiness/guided`, with one question per screen and a result
that reports clinic gaps rather than making patient-specific clinical claims:

1. Current MAT program stage: exploring, designing, preparing to launch,
   operating, or expanding.
2. Clinical lead and governance.
3. Written MAT policies, consent, and treatment-agreement workflows.
4. Escalation, higher-level-of-care, and transfer workflows.
5. UDS, PDMP, naloxone, safety, and diversion-response workflows.
6. EHR templates and documentation processes.
7. Staffing, training, behavioral-health, and referral workflows.
8. Pilot, quality-improvement, and scale-readiness gaps.

The result should identify missing preparation areas and point to the relevant
implementation material. It must label this as operational readiness guidance,
not a state requirement or patient-care recommendation. The workflow should
reuse the existing guided interview components and remain separate from the
four deterministic clinical engines.

---

## 5. Action items

| # | Action | Owner | Depends on |
| --- | --- | --- | --- |
| 1 | Record McNabb's actual hosting/compliance criteria in §2 | Gerald, from 9/18 notes | today's meeting |
| 2 | Re-check §3 against the real criteria; open a blocker for every gap | Gerald | #1 |
| 3 | Decide the PHI-in-conversations policy (blocker B3) | Gerald/Emma | — |
| 4 | Add rate limiting before any URL sharing beyond the demo audience (5.6) | Gerald | — |
| 5 | Draft the clinician feedback survey instrument | Gerald/Emma | clinical review substantially underway |
| 6 | Confirm IRB determination is being pursued in parallel, not instead of, hosting approval | Gerald | #1 |
| 7 | Decide which new checklist items are approved for clinical-tool results versus the separate readiness workflow | Gerald/Emma + named clinician | new documents and clinical review |
| 8 | Choose the canonical readiness documents and remove duplicate formats from ingestion candidates | Gerald/Emma + McNabb | provenance and scope confirmation |

---

## 6. Log

| Date | What changed |
| --- | --- |
| 2026-09-18 | Created, ahead of hearing McNabb's actual criteria, to have a self-assessment ready and to connect the three approval gates in one place. |
