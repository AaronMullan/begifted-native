---
name: sentry-autofix
description: Headless Sentry-to-PR pipeline — pull unresolved Sentry errors, close the loop on previously merged autofix PRs, classify each issue, archive noise, file Jira tickets, and open at most 2 narrow fix PRs for human review. Designed to run unattended on a weekday launchd schedule via `claude -p`; also runnable interactively. Pass `dry-run` to execute the full pipeline with zero writes.
---

# Sentry Autofix

Unattended version of the manual triage loop: Sentry error → root cause → Jira ticket → fix PR. The human's only touchpoint is PR review/merge. This skill runs headless, so **never wait for user input** — every judgment call is resolved by the rubrics below, and anything the rubrics can't resolve is skipped and reported, never stalled on.

Argument: `dry-run` (optional) — run every phase but **write nothing**: no Jira tickets or transitions, no PRs, no branches pushed, no Sentry status changes. Print exactly what each write would have been.

## Hard rails (non-negotiable)

- **PR-only.** Never commit or push to `main` in any repo.
- **Never** run `supabase functions deploy`, `eas`, or create/modify migrations, schema DDL, or `system_prompt_versions` prompts.
- **No DB writes.** Supabase SQL is read-only diagnostics at most.
- **Never send Slack messages or create Slack drafts.**
- **Only operate in the bot clones** under `~/development/autofix/`. If cwd is not inside `~/development/autofix/`, and this is not an interactive dry-run, abort before any git operation.
- Caps per run: **≤ 2 fix PRs**, **≤ 6 new Jira tickets**, **≤ 10 Sentry issues archived**. Hitting a cap is reported, never silently exceeded.
- **Skip, don't stall:** if scope turns out ambiguous, the fix can't stay narrow, or typecheck/lint can't be made clean with a narrow change — abandon the branch (`git checkout main`, delete the branch, don't push), leave the ticket in To Do with a `jira_add_comment` explaining what blocked it, and move on.

## Constants

- Sentry: org `begifted`, project `4511361418395648` (react-native). Token: `SENTRY_TOKEN_TWO` in `.env.local` (never echo it). Load per the recipe: `TOKEN=$(grep -E '^SENTRY_TOKEN_TWO=' .env.local | sed -E 's/^SENTRY_TOKEN_TWO=//' | tr -d '"\r\n ')`.
- Jira: project `DEV`, reads via `.claude/scripts/jira-api`, writes via the Jira MCP. Transitions: In Progress `21`, Ready for Deploy `31`, Done `41`. Never pass `comment` to `jira_transition_issue` (requires ADF) — use `jira_add_comment` separately. Create issues one at a time (`jira_batch_create_issues` is unreliable).
- Repos: `~/development/autofix/begifted-native` and `~/development/autofix/be-gifted`. The wrapper script refreshes both to `origin/main` before this skill starts.
- Do not use the Sentry MCP — it is claude.ai-authenticated and absent headless. All Sentry access is REST with the token above.

## Phase 0 — Preflight (abort loudly on any failure)

1. Unless dry-running interactively, confirm cwd is inside `~/development/autofix/`.
2. Confirm both clones are on clean `main` matching `origin/main` (`git status --short` empty; the wrapper already reset them — verify, don't fix).
3. Confirm `SENTRY_TOKEN_TWO` loads, `jira-api get '/rest/api/2/myself'` succeeds, and `gh auth status` succeeds. The Sentry health probe is the **issues endpoint** (the Phase 1 list call) — the token is scoped narrowly and 403s on org-root/member endpoints even though issue read/write works.

On failure: print `AUTOFIX ABORT: <reason>` and stop. The wrapper surfaces it via notification + log.

## Phase 1 — Gather & close the loop

1. Pull unresolved issues:
   ```bash
   GET https://sentry.io/api/0/organizations/begifted/issues/?project=4511361418395648&statsPeriod=14d&query=is:unresolved&sort=freq&limit=25
   ```
   Capture per issue: shortId, numeric id, title, culprit, count, userCount, level, firstSeen/lastSeen. For issues that look diagnosable, pull events for tags/contexts:
   ```bash
   GET https://sentry.io/api/0/organizations/begifted/issues/<numericId>/events/?full=true&statsPeriod=14d
   ```
   (Parse with python3, not jq — Sentry bodies carry unescaped control characters.)
2. **Close the loop from prior runs:** search Jira for autofix tickets awaiting merge:
   ```bash
   .claude/scripts/jira-api search 'project = DEV AND labels = autofix AND status = "Ready for Deploy"' 'summary,description' 20
   ```
   For each: find its PR (`gh pr list --state merged --search "<DEV-key>"` in both repos). If merged: resolve the linked Sentry issue (`PUT .../issues/<numericId>/ {"status":"resolved"}` — the short ID is in the ticket body; map it via `GET .../organizations/begifted/shortids/<SHORT_ID>/`), then transition the ticket to Done and `jira_add_comment` noting the merge. If the PR was closed without merging: comment and transition the ticket back to To Do. If still open: leave it.

## Phase 2 — Classify

For each unresolved issue, in order (most events first), assign exactly one bucket. **Dedup comes first and is mandatory**:

```bash
.claude/scripts/jira-api search 'project = DEV AND text ~ "<SHORT-ID>"' 'summary,status' 10
.claude/scripts/jira-api search 'project = DEV AND statusCategory != Done AND text ~ "<title keywords>"' 'summary,status' 10
gh pr list --search "<SHORT-ID>" --state all   # in both repos
```

Jira `text ~` search is tokenized — a short-ID query matches every ticket mentioning any `REACT-NATIVE-*` ID. A hit only counts as tracked if its summary/description actually concerns this error; confirm by reading, never by hit-count.

- **already-tracked** — an open ticket or PR covers it. Skip; list it in the report with the existing key.
- **fixable** — ALL of: (a) confident code-level root cause in `begifted-native` or `be-gifted`, confirmed by reading the actual code, not just the stack; (b) the fix is narrow and mechanical (guard, validation, off-by-one, bad URL handling — the kind of change that fits in one small PR); (c) requires no product/design judgment, no schema/migration/DDL, no prompt changes, no dependency upgrades; (d) not internal to a library we don't own and not OS/network-transient.
- **ticket-only** — a real, recurring bug that fails the fixable rubric or lands over the PR cap. Gets a ticket, no PR.
- **noise** — no code defect to act on: single-event transients ("App Hanging" one-offs, one-off network failures, device-specific flukes) with no recurrence and no code smell. Also: errors only occurring on releases ≥ 2 builds old when the code path has since changed.

When volume matters, weigh recurrence and users affected: 1 event / 1 user / no recurrence in 14d leans noise; recurring across days or users leans real.

**Noise handling:** archive in Sentry so the next run doesn't re-triage it — it returns to unresolved automatically if it escalates:

```bash
PUT https://sentry.io/api/0/organizations/begifted/issues/<numericId>/  {"status":"ignored"}
POST https://sentry.io/api/0/organizations/begifted/issues/<numericId>/notes/  {"text":"autofix: archived as noise — <one-line reason>"}
```

Every archive must carry the note. If the notes endpoint fails, still archive, but say so in the report.

## Phase 3 — Fix loop (sequential, never interleaved)

Order fixable issues by (users affected × recurrence), take the top 2; the rest become ticket-only.

For each fixable issue:

1. **File the ticket first** (`jira_create_issue`, type Bug, assignee Aaron, label `autofix` via `additional_fields: {"labels": ["autofix"]}`). Body must contain: the Sentry short ID on its own line (`Sentry: REACT-NATIVE-X`), root cause with `path:line` references, and the planned narrow fix. The short ID line is what makes Phase 1 loop-closure and Phase 2 dedup work — never omit it.
2. In the affected bot clone: `git checkout main && git checkout -b DEV-<n>-<short-slug>`.
3. Implement the **narrowest fix**. Follow CLAUDE.md conventions (Paper-only UI, no `useCallback`/`useMemo`, `import type`, comment the why not the what).
4. Changelog fragment: `changelog.d/DEV-<n>.<app|backend>.md` in **begifted-native** — one user-facing bullet ending with the ticket ID. For a fix landing in `be-gifted`, the fragment goes in the begifted-native clone as its own branch + PR (`DEV-<n>-changelog`), per the established pattern.
5. Verify: `npm run typecheck && npm run lint` clean in every repo touched. Never claim a pass without running it.
6. Push the branch and `gh pr create --title "<type>: <summary> (DEV-<n>)"` with body covering root cause, the change, verification performed, and the Sentry issue link. Cross-link PRs when two repos are involved.
7. Conflict check: `git fetch origin main && git merge origin/main --no-edit`; if conflicts, resolve narrowly, re-verify, push.
8. Transition the ticket to **Ready for Deploy** (`31`), then `jira_add_comment` with the PR URL(s).

Do **not** resolve the Sentry issue here — that happens in a later run's Phase 1, after the PR merges.

Ticket-only issues: file the ticket (same format, label `autofix`, note why no PR: `over PR cap` or the failed rubric clause) and leave it in To Do.

## Phase 4 — Report

End with a summary block (this is what lands in the launchd log and what a human reads first):

```
AUTOFIX RUN <date>
  loop-closed:  DEV-xxx (PR merged → Sentry REACT-NATIVE-X resolved, ticket Done)
  PRs opened:   DEV-yyy <pr-url> (REACT-NATIVE-Y)
  tickets only: DEV-zzz (REACT-NATIVE-Z — over PR cap)
  archived:     REACT-NATIVE-W (single-event app-hang, no recurrence)
  skipped:      REACT-NATIVE-V (ambiguous scope — <question a human must answer>)
  already tracked: REACT-NATIVE-U → DEV-aaa
```

Every issue from Phase 1 must appear on exactly one line. In dry-run mode, prefix the block with `DRY RUN — nothing was written` and phrase entries as `would open`, `would archive`, etc.
