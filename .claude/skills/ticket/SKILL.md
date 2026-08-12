---
name: ticket
description: Take a Jira ticket end-to-end — read it, branch, implement the narrowest fix, typecheck/lint, open a PR, resolve any merge conflicts with main, run a fresh-context code review, wait for CI and merge, transition to Done, and draft a Slack summary. Use when the user hands off one or more Jira ticket IDs (e.g. "/ticket DEV-110" or "/ticket DEV-110 DEV-112").
---

# Implement Jira Ticket

Take a Jira ticket from investigation to merged-ready PR. The ticket ID is passed as the argument (e.g. `DEV-110`). If no ID is given, ask for one before proceeding.

## Steps

1. **Read the ticket.** Fetch it via REST (not the Jira MCP — REST + `jq` keeps the payload small; see _Jira reads vs writes_ below):

   ```bash
   .claude/scripts/jira-api get '/rest/api/2/issue/<KEY>?fields=summary,description,status,priority,labels,issuelinks,attachment' \
     | jq '{key, summary: .fields.summary, status: .fields.status.name, description: .fields.description, links: [.fields.issuelinks[]? | {type: .type.name, key: (.inwardIssue.key // .outwardIssue.key)}], attachments: [.fields.attachment[]? | {filename, content}]}'
   ```

   Capture summary, description, acceptance criteria, linked designs/PRs. If the description cites prior-art/related tickets, glance at them for context (same `jira-api get` on each key). **Pull any attached screenshots** — download each attachment's `content` URL with `.claude/scripts/jira-api download <url> <scratchpad-path>` and Read the file — the original reporter's screenshot (e.g. carried over from a Slack report) usually shows the concrete error/UI better than the text. Identify which repo(s) are affected — this app (`begifted-native`) and/or the sibling `be-gifted` backend repo. If the ticket links a Figma/PDF design, confirm the interaction model and exact components/icons before coding (see CLAUDE.md → _Implementing from Designs_).

2. **Scope it first.** Before writing code, give a 3-line plan: root cause, the smallest change that fixes it, and which files. Start with the narrowest fix that satisfies the ticket — do not expand scope or refactor unless required. Pause for sign-off if scope is ambiguous or any change is destructive.

3. **Branch off main.** Never commit to `main`. Create a feature branch:

   ```bash
   git checkout main && git pull && git checkout -b <ticket-id>-<short-slug>
   ```

4. **Implement** the narrowest fix across the affected files. Follow the conventions in CLAUDE.md (Paper-only UI, no `useCallback`/`useMemo`, `import type`, etc.). For edge-function or parser changes, read the active prompt from `system_prompt_versions` first — the prompt is the source of truth.

5. **Add a changelog fragment.** Create `changelog.d/DEV-<number>.<app|backend>.md` (repo root; `.app.md` for RN/JS changes, `.backend.md` for edge-function/migration changes) containing one user-facing bullet line describing what a tester will _notice_ — not the technical change — ending with the ticket ID. Do **not** edit `CHANGELOG.md` itself; it only holds released, dated headings (see `changelog.d/README.md`). Commit the fragment with the fix. (Backend changes in the sibling `be-gifted` repo: add a fragment in this app's repo only if a tester would see the effect in the app.)

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

8. **Check for merge conflicts with `main`.** Other tickets land on `main` while you work. Fetch and check before considering the PR done:

   ```bash
   git fetch origin main && git merge origin/main --no-edit
   ```

   If it merges cleanly, proceed. If it conflicts, resolve by hand, re-run `npm run typecheck && npm run lint` (the incoming `main` changes may touch files you edited), commit the merge (`git commit --no-edit`), `git push`, then confirm the PR is conflict-free. (Changelog fragments are one file per ticket, so they never conflict — a conflict means real code overlap.)

9. **Fresh-context code review.** These PRs self-merge — this step is the only review they get. Do **not** review the diff yourself: the context that wrote the code carries the assumptions that produced any bug in it. Spawn a subagent via the Agent tool with a prompt containing (a) the ticket summary and acceptance criteria, (b) an instruction to run `git diff origin/main...HEAD` and adversarially review it for defects. The reviewer must report **only findings that change behavior** — bugs, broken edge cases, violated repo invariants (Paper-only UI, the `react-native-url-polyfill` import rules, reasoning-model token budgets, GradientBackground placement, migration idempotency) — never style nits or refactor suggestions; each finding needs a concrete failure scenario, not a hunch.

   Then:
   - **Confirmed behavior-level findings:** fix them, re-run `npm run typecheck && npm run lint`, push. At most **one** re-review, scoped to the fix itself — then proceed to merge regardless. No open-ended review-fix loops.
   - **Findings that would expand scope beyond the ticket:** don't fix them; record them in the final report (or propose a follow-up ticket).
   - **No findings:** proceed.

10. **Wait for CI, then merge the PR.** Nobody else reviews or merges these PRs — an open PR is stranded work that everyone believes shipped (this exact failure left four Done-ticket PRs unmerged for weeks):

    ```bash
    gh pr checks <pr#> --watch --interval 15
    gh pr merge <pr#> --merge
    ```

    If CI fails, fix it before moving on. If the merge is blocked for a reason you can't resolve, transition the ticket to **Ready for Deploy** (not Done) and surface the blocker in the final report.

11. **Transition the ticket to Done** — only after confirming the merge landed (`gh pr view <pr#> --json state` shows `MERGED`). Use `jira_transition_issue` (do NOT pass a `comment` argument — it requires ADF, not plain text; add any note separately via `jira_add_comment`). Done means merged: never transition to Done on the strength of an open PR.

12. **Draft a Slack summary.** Write a clipboard-ready, plain-English summary of what changed and why for the team. **Don't mention the PR or code review** — the fresh-context review is an internal quality gate, and no human on the team reviews these PRs. Do say whether it's **live now** (backend changes deploy on merge) or **waiting for the next build/OTA** (app changes), and tell testers **what to look for** once it's live. Offer to send it via the Slack MCP as a _draft_ (always `slack_send_message_draft`, never send) — in the original report thread when the ticket links one — or print it for the user to copy.

## Autonomous mode

Run the whole pipeline end-to-end without stopping between steps. The done-state is: the PR in each affected repo (with the changelog updated) **merged to `main` with CI green**, the Jira ticket transitioned to Done, and a Slack summary drafted. A PR left open is not a done-state — it is the failure mode this pipeline exists to prevent. **Pause only when:**

- Scope is ambiguous or the ticket is underspecified (ask a focused question, don't guess).
- A change is destructive or hard to reverse (schema drop, prod data mutation, edge-function deploy) — surface it for sign-off first.
- Typecheck/lint can't be made clean with a narrow fix (report what's blocking instead of expanding scope).

Otherwise keep going. Do not stop at "wrote the code" — commit, PR, review, merge, transition, and draft the summary. Review findings are handled inline per step 9 (fix behavior-level findings, defer scope-expanding ones to the report) — they are not a pause condition.

## Multiple tickets

If given several ticket IDs (space- or comma-separated), run them **sequentially** — each run branches off `main` and shares the working tree, so never interleave. Adjust the pipeline as follows:

- **Triage first.** Fetch all tickets before implementing any. Flag duplicates, already-Done tickets, and overlap (two tickets wanting the same change → propose one PR). Order: dependencies first, then the order given. Print the planned order with a one-line scope note per ticket before starting.
- **Run each ticket in autonomous mode**, starting from a clean, freshly pulled `main`.
- **Skip, don't stall.** If a ticket hits a pause condition (ambiguous scope, destructive change), record the blocking question, leave that ticket untouched, and move to the next — never guess to keep the batch moving. Surface all deferred questions in the final report.
- **One combined Slack draft** at the end instead of per-ticket drafts, plus a status table: ticket → merged PR link / skipped+why → live-on-merge vs next-build.
- Because each ticket merges before the next begins, every run branches off a `main` that already contains the previous tickets' changes — batch PRs can no longer conflict with each other.

## Notes

- **Jira reads vs writes:** all reads/searches go through `.claude/scripts/jira-api` (REST + `jq` — filter fields so full issue payloads never enter context); writes (`jira_create_issue`, `jira_add_comment`, `jira_transition_issue`, `jira_update_issue`) stay on the Jira MCP, which handles markdown→ADF.
- Deploy edge functions via PR + merge, never direct CLI deploy.
- Verify a PR is still open before pushing follow-up commits — PRs merge fast.
- If a fix needs a production data backfill, call it out and propose the backfill query for review.
