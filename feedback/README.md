# Site feedback

Responses to the **Feedback** survey (the button in the site header) are
stored in the app's database. To copy new ones here:

```bash
./a4k feedback
```

Each response becomes one Markdown file in `inbox/`, named
`<date>_<time UTC>_<id>.md`. The command never exports a response twice. It
skips any file already filed under `feedback/`, so to triage a response, move
its file:

| Folder | Meaning |
| --- | --- |
| `inbox/` | New, not yet read |
| `planned/` | We will make this change |
| `done/` | Change made |
| `declined/` | Decided not to act on it |

The response files are **gitignored**. They can contain testers' email
addresses and, despite the warning on the form, possibly patient details, so
they stay on the server rather than in the repo. If a response leads to work,
record the decision in the project plan or your session handoff, not by
committing the response.

The questions are defined in `backend/app/services/feedback.py`. Edit them
there; the form loads them from the API.
