# All4Knox — working agreements for every session

This is a **team repository**. Two maintainers work in it, each with their own
Claude sessions:

| Maintainer | GitHub | `git config user.name` | Handoff |
| --- | --- | --- | --- |
| Emma (repo owner) | `Emmagrace0130` | — | [`docs/emma_sessions/session-handoff.md`](docs/emma_sessions/session-handoff.md) |
| Gerald Jones | `gjones1911` | `gjones1911` | [`docs/gerald_sessions/session-handoff.md`](docs/gerald_sessions/session-handoff.md) |

## Session handoffs are per maintainer

1. **Work out whose session this is** before you read or write a handoff: the
   person you are talking to, or `git config user.name`. If you can't tell,
   ask.
2. **Read and update only that maintainer's handoff.** Never edit the other
   maintainer's copy, even to fix an error in it. Tell your user instead, so
   they can raise it with the other maintainer.
3. `docs/session-handoff.md` at the docs root is the old shared copy, frozen at
   2026-09-15. It is neither maintained nor current; don't update it.
4. Append your session-log row to your maintainer's handoff only.

## Shared documents belong to both maintainers

`docs/project-plan.md`, `docs/compliance-readiness-plan.md`,
`docs/reference-incorporation-plan.md`, `docs/meeting_notes/`,
`docs/rules-of-engagement.md`, `docs/frontend-guide.md`, and this file are
shared. Change them when your work requires it, limit the edit to what
changed, and say what you changed in the commit message so the other
maintainer sees it. Record a decision the other maintainer should know about in
the shared doc, not only in your handoff.

## Before changing anything

- Your maintainer's handoff describes what was true when it was written; the
  repo is the authority. Check `git log --oneline --all`, `git status` and
  `./a4k status` first.
- **Shared server.** Read `docs/rules-of-engagement.md` before any `docker`
  command, and use `./a4k`. Never prune, and never touch containers this
  project didn't create.
- **Clinical text** lives only in `frontend/src/content/`. The backend JSON is
  generated from it; see handoff §3a. Nothing is marked clinically reviewed
  except through `/review`.
