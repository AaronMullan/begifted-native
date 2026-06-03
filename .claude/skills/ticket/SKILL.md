---
name: ticket
description: Take a Jira ticket end-to-end — read it, branch, implement the narrowest fix, typecheck/lint, open a PR, transition to Done, and draft a Slack summary. Use when the user hands off a Jira ticket ID (e.g. "/ticket DEV-110").
---

# Implement Jira Ticket

Take a Jira ticket from investigation to merged-ready PR. The ticket ID is passed as the argument (e.g. `DEV-110`). If no ID is given, ask for one before proceeding.

## Steps

1. **Read the ticket.** Fetch it with `jira_get_issue` (summary, description, acceptance criteria, linked designs/PRs). Identify which repo(s) are affected — this app (`begifted-native`) and/or the sibling `be-gifted` backend repo. If the ticket links a Figma/PDF design, confirm the interaction model and exact components/icons before coding (see CLAUDE.md → _Implementing from Designs_).

2. **Scope it first.** Before writing code, give a 3-line plan: root cause, the smallest change that fixes it, and which files. Start with the narrowest fix that satisfies the ticket — do not expand scope or refactor unless required. Pause for sign-off if scope is ambiguous or any change is destructive.

3. **Branch off main.** Never commit to `main`. Create a feature branch:

   ```bash
   git checkout main && git pull && git checkout -b <ticket-id>-<short-slug>
   ```

4. **Implement** the narrowest fix across the affected files. Follow the conventions in CLAUDE.md (Paper-only UI, no `useCallback`/`useMemo`, `import type`, etc.). For edge-function or parser changes, read the active prompt from `system_prompt_versions` first — the prompt is the source of truth.

5. **Verify.** Run typecheck and lint until clean:

   ```bash
   npm run typecheck && npm run lint
   ```

   Do not claim either passed unless you ran it and saw the result.

6. **Open a PR.** Commit, push, and open a PR referencing the ticket:

   ```bash
   gh pr create --title "<type>: <summary> (<TICKET-ID>)" --body "..."
   ```

   The PR body should state root cause, the change, and how it was verified. If the work spans both repos, open a PR in each and cross-link them.

7. **Transition the ticket to Done** with `jira_transition_issue` (do NOT pass a `comment` argument — it requires ADF, not plain text; add any note separately via `jira_add_comment`).

8. **Draft a Slack summary.** Write a clipboard-ready, plain-English summary of what changed and why for the team. Offer to send it via the Slack MCP, or just print it for the user to copy.

## Autonomous mode

Run the whole pipeline end-to-end without stopping between steps. The done-state is: a PR open and ready for review in each affected repo, the Jira ticket transitioned to Done, and a Slack summary drafted. **Pause only when:**

- Scope is ambiguous or the ticket is underspecified (ask a focused question, don't guess).
- A change is destructive or hard to reverse (schema drop, prod data mutation, edge-function deploy) — surface it for sign-off first.
- Typecheck/lint can't be made clean with a narrow fix (report what's blocking instead of expanding scope).

Otherwise keep going. Do not stop at "wrote the code" — commit, PR, transition, and draft the summary.

## Notes

- Deploy edge functions via PR + merge, never direct CLI deploy.
- Verify a PR is still open before pushing follow-up commits — PRs merge fast.
- If a fix needs a production data backfill, call it out and propose the backfill query for review.
