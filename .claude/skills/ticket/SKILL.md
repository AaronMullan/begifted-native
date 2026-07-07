---
name: ticket
description: Take a Jira ticket end-to-end — read it, branch, implement the narrowest fix, typecheck/lint, open a PR, resolve any merge conflicts with main, transition to Done, and draft a Slack summary. Use when the user hands off one or more Jira ticket IDs (e.g. "/ticket DEV-110" or "/ticket DEV-110 DEV-112").
---

# Implement Jira Ticket

Take a Jira ticket from investigation to merged-ready PR. The ticket ID is passed as the argument (e.g. `DEV-110`). If no ID is given, ask for one before proceeding.

## Steps

1. **Read the ticket.** Fetch it with `jira_get_issue` (summary, description, acceptance criteria, linked designs/PRs). If the description cites prior-art/related tickets, glance at them for context. **Pull any attached screenshots** with `jira_get_issue_images` — the original reporter's screenshot (e.g. carried over from a Slack report) usually shows the concrete error/UI better than the text. Identify which repo(s) are affected — this app (`begifted-native`) and/or the sibling `be-gifted` backend repo. If the ticket links a Figma/PDF design, confirm the interaction model and exact components/icons before coding (see CLAUDE.md → _Implementing from Designs_).

2. **Scope it first.** Before writing code, give a 3-line plan: root cause, the smallest change that fixes it, and which files. Start with the narrowest fix that satisfies the ticket — do not expand scope or refactor unless required. Pause for sign-off if scope is ambiguous or any change is destructive.

3. **Branch off main.** Never commit to `main`. Create a feature branch:

   ```bash
   git checkout main && git pull && git checkout -b <ticket-id>-<short-slug>
   ```

4. **Implement** the narrowest fix across the affected files. Follow the conventions in CLAUDE.md (Paper-only UI, no `useCallback`/`useMemo`, `import type`, etc.). For edge-function or parser changes, read the active prompt from `system_prompt_versions` first — the prompt is the source of truth.

5. **Update the changelog.** Add one user-facing line to the `## Unreleased` section of `CHANGELOG.md` (repo root) describing what a tester will _notice_ — not the technical change. Group it under `### App (ships next build / OTA)` for RN/JS changes or `### Backend (live on merge)` for edge-function/migration changes. Commit it with the fix. (Backend changes in the sibling `be-gifted` repo: note them in this app's changelog only if a tester would see the effect in the app.)

6. **Verify.** Run typecheck and lint until clean:

   ```bash
   npm run typecheck && npm run lint
   ```

   Do not claim either passed unless you ran it and saw the result.

7. **Open a PR.** Commit, push, and open a PR referencing the ticket:

   ```bash
   gh pr create --title "<type>: <summary> (<TICKET-ID>)" --body "..."
   ```

   The PR body should state root cause, the change, and how it was verified. If the work spans both repos, open a PR in each and cross-link them.

8. **Check for merge conflicts with `main`.** Other tickets land on `main` while you work, and every ticket appends to the same `## Unreleased` block in `CHANGELOG.md` — so a changelog conflict is the common case, not the exception. Fetch and check before considering the PR done:

   ```bash
   git fetch origin main && git merge origin/main --no-edit
   ```

   If it merges cleanly, you're done. If it conflicts, resolve and push:

   - **`CHANGELOG.md`** (the usual culprit): keep **both** sides' entries under `## Unreleased` — this is an append conflict, never drop the other ticket's line.
   - **Any code file**: reconcile by hand, then re-run `npm run typecheck && npm run lint` before committing the merge (the incoming `main` changes may touch files you edited).
   - Commit the merge (`git commit --no-edit`) and `git push`, then confirm the PR is conflict-free.

9. **Transition the ticket to Done** with `jira_transition_issue` (do NOT pass a `comment` argument — it requires ADF, not plain text; add any note separately via `jira_add_comment`).

10. **Draft a Slack summary.** Write a clipboard-ready, plain-English summary of what changed and why for the team. **Don't mention the PR or code review** — nobody reviews the PRs. Do say whether it's **live now** (backend changes deploy on merge) or **waiting for the next build/OTA** (app changes), and tell testers **what to look for** once it's live. Offer to send it via the Slack MCP as a _draft_ (always `slack_send_message_draft`, never send) — in the original report thread when the ticket links one — or print it for the user to copy.

## Autonomous mode

Run the whole pipeline end-to-end without stopping between steps. The done-state is: a PR open in each affected repo (with the changelog updated) that is **conflict-free against `main`**, the Jira ticket transitioned to Done, and a Slack summary drafted. **Pause only when:**

- Scope is ambiguous or the ticket is underspecified (ask a focused question, don't guess).
- A change is destructive or hard to reverse (schema drop, prod data mutation, edge-function deploy) — surface it for sign-off first.
- Typecheck/lint can't be made clean with a narrow fix (report what's blocking instead of expanding scope).

Otherwise keep going. Do not stop at "wrote the code" — commit, PR, transition, and draft the summary.

## Multiple tickets

If given several ticket IDs (space- or comma-separated), run them **sequentially** — each run branches off `main` and shares the working tree, so never interleave. Adjust the pipeline as follows:

- **Triage first.** Fetch all tickets before implementing any. Flag duplicates, already-Done tickets, and overlap (two tickets wanting the same change → propose one PR). Order: dependencies first, then the order given. Print the planned order with a one-line scope note per ticket before starting.
- **Run each ticket in autonomous mode**, starting from a clean, freshly pulled `main`.
- **Skip, don't stall.** If a ticket hits a pause condition (ambiguous scope, destructive change), record the blocking question, leave that ticket untouched, and move to the next — never guess to keep the batch moving. Surface all deferred questions in the final report.
- **One combined Slack draft** at the end instead of per-ticket drafts, plus a status table: ticket → PR link / skipped+why → live-on-merge vs next-build.
- Sibling PRs from one batch will conflict with each other on `CHANGELOG.md` as they merge — expected. If the user starts merging, offer to re-run step 8 on the remaining open branches after each merge.

## Notes

- Deploy edge functions via PR + merge, never direct CLI deploy.
- Verify a PR is still open before pushing follow-up commits — PRs merge fast.
- If a fix needs a production data backfill, call it out and propose the backfill query for review.
