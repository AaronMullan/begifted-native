# Changelog fragments

Unreleased release notes live here as **one file per ticket** so parallel PRs
never conflict on a shared `CHANGELOG.md` section. `CHANGELOG.md` itself only
contains released, dated headings.

## Adding an entry

With your ticket's PR, add a file:

```
changelog.d/DEV-<number>.<app|backend>.md
```

- `.app.md` — React Native / JS changes. Ship on the next EAS build or OTA
  update; **not** live on merge.
- `.backend.md` — edge functions, migrations. Go **live on merge** to `main`
  via the auto-deploy workflows.

The file contains the bullet line(s) exactly as they will appear in
`CHANGELOG.md` — one or more `- ...` lines describing what a tester will
**notice**, not the technical change, ending with the ticket ID:

```markdown
- Tapping a notification now takes you straight to the latest gift ideas for that person (DEV-208).
```

Work without a ticket uses a short slug instead of a ticket number
(e.g. `repo-hygiene.app.md`).

## At release time

Compile the fragments into `CHANGELOG.md` under a new dated heading and delete
them:

1. Add `## <date> — <Build N (TestFlight) | OTA>` at the top of the released
   entries in `CHANGELOG.md`.
2. Concatenate all `*.app.md` bullets under `### App` and all `*.backend.md`
   bullets under `### Backend` (skip a subsection with no fragments).
3. `git rm` the compiled fragment files (leave this README).
4. Land it with the release PR and tag the release commit.
