# Clinical Review — design and status

**Built:** 2026-08-31. Backend, API and reviewer UI are live at `/review`.
**Status:** 0 of 29 blocks reviewed. No clinician has been recruited yet.

This is the gate on Phase 2 of [`project-plan.md`](project-plan.md): until
blocks are reviewed, the toolkit is honestly unreviewed and not usable for real
patient care.

---

## 1. The role split, and why it is enforced in code

Admin is a **system** role — it says you can configure software. Clinician is a
**professional attestation** — it says a licensed person put their name behind
clinical guidance. The engineers on this project hold admin.

| Role | Reaches `/review` | Records | Counts as reviewed |
| --- | --- | --- | --- |
| visitor / basic | yes, read-only | nothing | — |
| **clinician** | yes | `authority='clinical'` | **yes** |
| **admin** | yes | `authority='qa'` | **no** |

An admin's review is stored, shown in the audit trail, and labelled *Internal
QA*. It never marks a block reviewed and never moves `reviewedCount`. The UI
tells them so before they submit, in a warning panel.

This is the same lesson as the prompt bug earlier in the project: an engineer
must not be able to do a clinically meaningful thing by accident. Make it
structurally unavailable, do not rely on people remembering.

`test_review.py::test_admin_review_is_qa_and_never_counts` locks this.

---

## 2. Content hashing — the part that prevents silent drift

A review binds to a block **and to a sha256 of the exact text reviewed**.

```
review(block_id, content_hash, reviewer, decision, ...)
```

If the guidance is later edited, the hash stops matching and the block reports
`stale` — *"Content changed since review"* — rather than carrying the old
attestation onto new text. The old record is kept, not deleted; it simply no
longer applies.

This is what actually enforces skeleton §21's *"no silent rule changes"*.
Without it, editing content after sign-off would silently inherit the approval.

The reviewed text comes from `corpus.build_chunks()` — the same flattening the
assistant retrieves over — so a reviewer signs off on precisely what the system
serves, not a separate rendering of it.

---

## 3. Append-only audit trail

`content_reviews` is never UPDATEd or DELETEd. A correction is a new row.

A block's current state is derived from its newest `clinical` record:

| State | Meaning |
| --- | --- |
| `unreviewed` | no clinical review has ever been recorded |
| `reviewed` | approved, and the content still matches |
| `stale` | approved, but the content changed afterwards |
| `rejected` | reviewer judged it not clinically acceptable |
| `needs_info` | reviewer could not decide yet |

---

## 4. Credentials: recorded, never required

This is a pilot and the process will change, so credentials do **not** gate
reviewing. A clinician can start before their paperwork is on file; the record
then shows the credential as *missing* rather than implying one exists.

Stored per reviewer (all nullable): `credential`, `license_state`, `npi`, plus
an `extra` JSON column so fields can be added during the pilot without a
migration. Values are **snapshotted onto each review record**, not joined — a
renamed or deactivated account must never rewrite who attested to what.

---

## 5. Using it

1. An admin creates a clinician account (`POST /api/admin/users`, role
   `clinician`).
2. The clinician signs in and adds their credential at `/account`.
3. `/review` lists all 29 blocks, unreviewed and stale first.
4. Selecting a block shows the exact served text, its source slide, its hash,
   and the full history.
5. They record approve / approve-with-changes / needs-info / reject, with
   comments and an optional next-review date.
6. `/clinical-sources` and `GET /api/sources` update immediately.

### The two known clinical questions

Both are flagged in the toolkit and should be resolved through this workflow:

1. **Oxycodone wait time** — slide 4 says 12 hrs, slide 5 branches on >24 hrs.
2. **Referral contact details** — unverified for all four organisations. The
   McNabb Center's are the obvious first to confirm.

---

## 6. Verified

* 15 unit tests (`backend/tests/test_review.py`)
* 19 live API checks — role split, QA vs clinical, credential snapshotting,
  audit trail, `/api/sources` integration
* 12 browser checks — visitor read-only, admin warning, form, queue

**Note:** the API check run recorded synthetic reviews on the live system.
They were deleted immediately — a fabricated attestation is exactly what this
system exists to prevent, and "it was only test data" is how one ships. If you
test against production, clean up in the same breath.

---

## 7. Still open

| # | Item |
| --- | --- |
| 7.1 | **Recruit a clinical reviewer.** Nothing else here matters until this happens. |
| 7.2 | Decide whether high-risk blocks (dose limits, TennCare rules) need two-person sign-off |
| 7.3 | Reviewer-facing export — a PDF or CSV of the full review record for an IRB or a manuscript |
| 7.4 | Notification when a review goes stale after a content edit |
| 7.5 | Whether `approved_with_changes` should block publication until the changes land |
