# Accounts, Sessions & Assistant Configuration — implementation plan

**Started:** 2026-08-31 (late session)
**Status:** phases 2.1–2.6 built and verified live; 2.7–2.8 not started.

**Verified 2026-08-31:** 29/29 API checks (sessions, roles, persistence,
isolation, clamping, prompt status) and 8/8 browser checks (markdown rendering,
threading, transcript survives reload).

Requested: persistent assistant conversations, visitor + account roles,
clinician/admin document upload, tunable generation settings, admin-managed
system prompts, and correct markdown rendering.

---

## 0. The constraint that shapes everything

The assistant's safety story is that **it can only answer from reviewed
clinical content**. Retrieval below a measured floor means the model is never
called (see [`session-handoff.md`](session-handoff.md) §6).

Letting clinicians upload documents breaks that — unless provenance is tracked.
So every chunk carries a tier:

| Tier | Meaning | Citation shows |
| --- | --- | --- |
| `approved` | From `frontend/src/content/` — the reviewed clinical set | Source, slide, content version |
| `uploaded` | Added by a clinician or admin. **Not clinically reviewed.** | Uploader, upload date, **"not clinically reviewed"** |

Rules that must not be relaxed without a clinician agreeing:

1. An answer citing any `uploaded` chunk says so, prominently.
2. `approved` chunks outrank `uploaded` at equal relevance.
3. A visitor never retrieves `uploaded` content.
4. Uploads never overwrite or edit approved content.

---

## 1. Roles

| Role | Can | Session |
| --- | --- | --- |
| **visitor** | Use every deterministic tool; ask the assistant against `approved` content only | Server-side, TTL, **wiped after inactivity** |
| **basic** | Visitor + conversation history retained across logins | Account |
| **clinician** | Basic + upload documents, tune own generation settings | Account |
| **admin** | Clinician + manage system prompts, publish defaults, manage users | Account |

Deterministic clinical tools are available to everyone, always, signed in or
not. Nothing about accounts gates clinical guidance.

---

## 2. Phases

### 2.1 Markdown rendering ✅
The model emits markdown; the page rendered it as plain text. Fixed with a
small, auditable renderer that emits React elements and **cannot emit raw
HTML** — no `dangerouslySetInnerHTML`, no dependency. See §4.

### 2.2 Persistence foundation ✅
SQLite (skeleton §2 sanctions SQLite), WAL mode so the API's 2 uvicorn workers
share state. Tables: `users`, `sessions`, `conversations`, `messages`,
`generation_settings`, `system_prompts`, `documents`, `document_chunks`.

### 2.3 Conversations ✅
Assistant conversations persist per session, so switching tabs and returning
continues the thread. Visitor conversations are deleted with their session.

### 2.4 Auth + roles ✅
Password hashing (PBKDF2-HMAC-SHA256), opaque session tokens, HTTP-only
cookies, role checks as FastAPI dependencies.

### 2.5 Generation settings ✅
Per-user temperature / top_p / top_k / max_tokens / repeat_penalty, with
admin-set system defaults and validated bounds.

### 2.6 System prompts ✅
Admins draft, save and test prompt variants privately, then publish one as the
system default. Every variant is versioned and attributed.

### 2.7 Document upload ⬜ NOT STARTED
Schema is in place (`documents`, `document_chunks` with a `provenance` column)
but nothing writes to it yet, and `corpus.py` does not read it. **Until this
lands, no retrievable chunk is `uploaded` content** — the guarantee in §0
holds trivially.

*Update 2026-09-15:* retrieval is no longer toolkit-only. Three published
reference documents (TN guidelines, TennCare BESMART) are separate collections,
built by a developer with `./a4k reference`, not uploaded. They are labelled by
source type and answered in their own sections — see `session-handoff.md` §6
and `backend/app/rag/tools.py`. Upload should reuse that extraction pipeline
and give each uploaded document its own labelled collection.
Clinician/admin upload → chunk → embed → index with `uploaded` provenance.

### 2.8 Admin UI ⬜ NOT STARTED
The API is complete and testable with `curl`; there is no frontend for it yet.
Admins currently manage prompts, settings and users through the API directly.
Frontend surfaces for settings, prompts, documents, users.

---

## 3. Session lifecycle

```text
first request without a session cookie
   └── create visitor session, set HTTP-only cookie
         └── activity refreshes last_seen
               └── inactivity > VISITOR_SESSION_TTL_MINUTES (default 120)
                     └── session, its conversations and messages DELETED
```

Sweeping happens lazily on request plus on a periodic task, so an idle server
does not retain visitor data indefinitely. Signing in upgrades the session in
place; the visitor conversation is carried over rather than lost.

---

## 4. Why a hand-written markdown renderer

`react-markdown` + remark is a large dependency tree for one page. More
importantly, this app renders **model output** into a clinical UI, and the
safest possible property is that the renderer *structurally cannot* produce raw
HTML. `src/components/common/Markdown.tsx` parses a deliberate subset —
headings, bold, italic, inline code, code blocks, ordered/unordered lists,
blockquotes, links, tables, horizontal rules — and returns React elements.

Unsupported syntax degrades to visible text rather than being silently dropped.
Links render with `rel="noopener noreferrer"`, and non-http(s) schemes
(`javascript:`, `data:`) are refused.

---

## 5. Not doing (and why)

| Not doing | Why |
| --- | --- |
| OAuth / SSO | No institutional IdP agreed yet. Local accounts first. |
| Password reset by email | No mail infrastructure; admin resets passwords for now. |
| PHI in conversations | Skeleton §22. The UI warns; nothing enforces it server-side yet — see §6. |
| Per-document ACLs | Role-level access is enough at this scale. |

---

## 6. Open risks

1. **Conversation content is user-typed.** A provider could paste PHI despite
   the warning. Conversations are stored in SQLite on the server. Before any
   real clinical use, decide: retention limits, encryption at rest, or
   server-side refusal to store. **This needs a decision before the pilot.**
2. **Uploaded documents are unreviewed** by definition. The provenance tier
   makes that visible but does not stop a clinician trusting one.
3. **Rate limiting still absent** on assistant endpoints (project-plan 5.6),
   and accounts make abuse easier to attribute but no harder to attempt.


---

## 7. Two things found while building this

### 7.1 The seed-admin race (fixed)

The API runs multiple uvicorn workers. All of them start at once, all saw an
empty `users` table, and all tried to create the first admin. The losers hit
`UNIQUE constraint failed: users.email` and **the worker died at startup**.

Check-then-insert is not atomic across processes. `ensure_seed_admin` now
treats the integrity error as the expected outcome for a loser, and the
lifespan wraps the call so seeding can never abort boot.

### 7.2 The parallel session-minting race (fixed)

Every endpoint mints a session when a request arrives without a cookie. On
first page load, `getIdentity`, `getCurrentConversation` and
`getAssistantStatus` all fired in parallel with **no cookie yet**, so each
minted its own session and set its own cookie. The browser kept the last one —
but the conversation had been created under a different session, so the next
question returned **404**.

React runs child effects before parent effects, which made it worse: the page's
fetches ran before the provider had established anything.

Fixed on both sides:

* `AskAll4Knox` waits for `identityLoading` to clear before it fetches. This
  ordering is load-bearing — see the comment in that effect.
* A 404 from a stale conversation id is now recoverable: the page drops the id
  and the next question opens a fresh conversation, rather than dead-ending.

**If you add another page that creates server-side state, gate it the same
way.** This class of bug is invisible in a single-request test.

### 7.3 An admin could have disabled every guardrail (fixed)

The first version let an admin publish any prompt as the system default —
including one with none of the safety rules. Publishing a terse test prompt
silently removed "never invent doses", "you are not a clinician", and the
emergency-handling rule for every user at once.

The system prompt is now split:

* `SAFETY_PREAMBLE` — **not editable by anyone**, prepended to every request
* `STYLE_PROMPT` — the editable half: tone, structure, emphasis

Customisation can only *add* to the rules. `test_rules.py` asserts the
non-negotiables live in the preamble, are absent from the editable half, and
survive an arbitrary published variant.
