# Meeting notes — how we track them

One meeting = up to two files, named `<group>_meeting_<m>_<d>_<yy>[_agenda|_notes].md`:

- **`..._agenda.md`** — written *before* the meeting. Open questions, what
  changed since last time, what we're asking for. `mcnabb_meeting_9_18_26_agenda.md`
  is the template to copy.
- **`..._notes.md`** — written *during or right after*. What was actually
  decided, in the same numbered order as the agenda so the two are easy to
  diff by eye. Action items go into `docs/project-plan.md`'s blocker table in
  the same sitting, not left only in the notes.

If there was no agenda (an internal or ad hoc meeting), a single
`..._notes.md` is enough — see `mcnabb_meeting_9_1_26.md`.

## Index

| Date | Meeting | Agenda | Notes | Key outcomes |
| --- | --- | --- | --- | --- |
| 2026-09-01 | McNabb — Dr. Alexander | — | [mcnabb_meeting_9_1_26.md](mcnabb_meeting_9_1_26.md) | UX/backlog ask list; named clinical contact groundwork |
| 2026-09-18 | McNabb — Dr. Alexander | [mcnabb_meeting_9_18_26_agenda.md](mcnabb_meeting_9_18_26_agenda.md) | [mcnabb_meeting_9_18_26_notes.md](mcnabb_meeting_9_18_26_notes.md) | pending |

## After every meeting

1. Fill in (or create) the `..._notes.md` file, numbered to match the agenda.
2. Add a row to the index table above.
3. Update `docs/project-plan.md` — status columns and the blocker table —
   for anything the meeting resolved or changed.
4. Append a row to `docs/session-handoff.md` §8 if code or content changed as
   a result.
