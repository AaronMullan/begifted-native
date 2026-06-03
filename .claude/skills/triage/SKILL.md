---
name: triage
description: Triage swarm — pull top Sentry error clusters (and any pasted TestFlight feedback), root-cause each in parallel against the codebase, dedup against existing Jira, and produce a prioritized table of draft tickets for review before filing. Use when clearing a Sentry/feedback backlog.
---

# Triage Swarm

Turn the Sentry error backlog (plus optional TestFlight/PM feedback) into deduplicated, root-caused, prioritized Jira tickets — investigated in parallel, filed only after review.

Argument (optional): a Sentry project slug or a cap on clusters (e.g. `/triage 8`). Default: top ~10 unresolved issues by event volume across the active project.

## Phase 1 — Gather (single pass)

1. Resolve the project with `mcp__sentry__find_projects` if not given.
2. Pull the top unresolved issues with `mcp__sentry__search_issues` (sort by event count / users affected, last 14 days, unresolved). Capture: issue ID, title, culprit, event count, users affected, first/last seen.
3. If the user pasted TestFlight or PM feedback, add each distinct item to the work-list alongside the Sentry clusters. (Apple's API doesn't expose TestFlight feedback programmatically — these must be pasted in; note in the output if none were provided.)

Produce one flat work-list of distinct issues. Collapse obvious duplicates (same culprit/stack) before fanning out.

## Phase 2 — Investigate in parallel (one subagent per issue)

Spawn the subagents **concurrently** (one Task/Agent per work-item, in a single batch). Each agent is blind to the others and must return a structured draft:

- **Root cause:** grep the codebase (`begifted-native` and the sibling `be-gifted` backend) for the culprit/stack frames. For a Sentry issue, optionally call `mcp__sentry__analyze_issue_with_seer` for an AI root-cause hypothesis, then confirm it against the actual code.
- **Affected files:** concrete `path:line` references.
- **Dedup check:** `jira_search` for an existing open ticket matching this issue (by title keywords / error signature) **before** proposing a new one. If found, return the existing key instead of a draft.
- **Severity:** crash vs degraded vs cosmetic, weighted by users-affected and frequency.
- **Proposed fix:** the narrowest change that resolves it (one or two lines of intent, not a full diff).

Give each agent a shared note of the issue keys already seen so two agents don't both file the same thing.

## Phase 3 — Consolidate & review

Merge the drafts into a single **prioritized table** (severity × reach), separating:

- **New** — proposed tickets ready to file.
- **Duplicate** — maps to an existing Jira key (link the Sentry issue, don't refile).

Show the table and **wait for sign-off**. Do not file anything yet.

## Phase 4 — File approved tickets

For each approved draft: `jira_create_issue` (or `jira_batch_create_issues`) with severity, root cause, affected files, and proposed fix in the description. Then link the originating Sentry issue back to the ticket.

## Notes

- **Dedup is mandatory** — always `jira_search` before filing. Filing duplicates is worse than missing one.
- Do not pass a `comment` argument to `jira_transition_issue` — it requires ADF, not plain text.
- This is a _triage_ step: it produces tickets, it does not fix code. Hand the resulting tickets to `/ticket <KEY>` to implement.
- If you cap or sample the issue list, **say so** in the output — never let a silent top-N read as "the whole backlog."
- For heavy backlogs, this fan-out can be run as a multi-agent Workflow; the parallel-investigate phase is the part that benefits most.
