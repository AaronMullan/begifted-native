---
name: sentry-feedback-to-jira
description: Turn Sentry user feedback into Jira tickets — tickets only, never code changes. Pulls the `issue.category:feedback` inbox, filters junk, classifies each genuine report (bug/UX/feature), dedups against Jira, files tickets labeled `user-feedback`, then resolves the handled feedback in Sentry. Interactive by default (drafts wait for approval); pass `headless` to run unattended (weekday launchd schedule alongside sentry-autofix) — rubric-clean items are filed straight to To Do, borderline items are skipped and reported. Pass `dry-run` to execute the full pipeline with zero writes. Implements the DEV-199 process.
---

# Sentry Feedback → Jira

Convert the Sentry **User Feedback** inbox into tracked Jira work. This is the lightweight path DEV-199 calls for — distinct from `/triage`, which root-causes **error clusters** (stack traces by volume), and from `/sentry-autofix`, which opens fix PRs. Feedback is human prose from beta testers, so this skill classifies and dedups rather than grepping the stack — and it **only files tickets**: user feedback never drives code changes directly. A human re-prioritizes the labeled tickets before any work starts.

## Arguments (all optional, composable)

- A cap on items (e.g. `8`) or a lookback window (e.g. `30d`). Default: all unresolved feedback.
- `headless` — run unattended: no approval gate, judgment calls resolved by the rubrics below, anything a rubric can't resolve is **skipped and reported**, never stalled on and never filed. This is what the launchd wrapper invokes.
- `dry-run` — run every phase but **write nothing**: no Jira tickets, no Sentry status changes or notes. Print exactly what each write would have been.

## Modes

**Interactive (default):** one approval gate — you sign off on the ticket drafts (Step 3) before anything is filed. Borderline items are shown flagged `low-confidence` for you to keep or drop.

**Headless:** never waits for input. The junk/genuine and dedup rubrics decide everything; a borderline item (vague but possibly real) is **skipped** — left unresolved in Sentry for the next run or a human sweep — because filing unvetted guesses is worse than a one-day delay. Hard rails, mirroring `/sentry-autofix`:

- **Tickets only.** No branches, commits, PRs, migrations, deploys, prompt changes. No Slack messages or drafts. No DB writes.
- Cap: **≤ 20 new tickets per run.** This is a runaway guard, not a throttle — daily runs should clear beta-volume feedback. Overflow items stay unresolved in Sentry, are reported as "over cap, carried to next run", and get picked up next weekday.
- Do not use the Sentry MCP — it is claude.ai-authenticated and absent headless. All Sentry access is REST.

## Constants

- Sentry: org `begifted`, feedback project `4511361418395648` (react-native). Token: `SENTRY_TOKEN_TWO` in `.env.local` (never echo it): `TOKEN=$(grep -E '^SENTRY_TOKEN_TWO=' .env.local | sed -E 's/^SENTRY_TOKEN_TWO=//' | tr -d '"\r\n ')`.
- Jira: project `DEV`. Reads/searches via `.claude/scripts/jira-api`; writes via the Jira MCP. Create issues **one at a time** (`jira_batch_create_issues` is unreliable). Never pass `comment` to `jira_transition_issue` (requires ADF) — use `jira_add_comment`.
- Parse Sentry response bodies with python3, not jq — they carry unescaped control characters.

## Step 1 — Pull the feedback inbox

```bash
GET https://sentry.io/api/0/organizations/begifted/issues/?project=4511361418395648&query=issue.category:feedback%20is:unresolved&sort=date&limit=50
```

Capture per item: short-ID (`REACT-NATIVE-X`), numeric id, title, first/last seen. Then pull each item's **full feedback body** via the events endpoint (`GET .../issues/<numericId>/events/?full=true`) — the title is a paraphrase; the body carries the concrete detail (which screen, what the user expected, repro, the user's actual words). Draft from the body, not the title.

Keep each short-ID and URL — every ticket links back to its feedback, and Step 5 resolves by short-ID. The `limit=50` is deliberately above the ticket cap so the final report can account for the whole inbox even when capped.

## Step 2 — Filter junk, then extract

**Junk filter first.** Drop test/placeholder entries with no actionable content — "Blah blah blah", "Something bad happened", lorem-ipsum, empty bodies. Borderline items (vague but possibly real): interactive keeps them flagged `low-confidence`; headless **skips** them (reported, left unresolved). **Say how many you dropped or skipped and why** — never let a filtered item vanish unaccounted.

For each genuine item, draft:

- **Summary** — a tight, imperative title (the fix, not the complaint: "Show past occasions in calendar", not "Calendar is missing stuff").
- **Type** — Bug / UX / Story. A crash or wrong behaviour is a Bug; a rough-but-working interaction is UX; a "wish it could…" is a Story.
- **Priority** — your read of severity × reach. A reported crash outranks a copy nit.
- **Description** — what the user reported (quote the relevant feedback line), which screen/flow it concerns, any acceptance criteria you can infer, and the Sentry feedback URL. Must include the short-ID on its own line — `Sentry: REACT-NATIVE-X` — that line is what makes re-run dedup and Step 5 resolution work; never omit it.
- **Locate the screen (light touch).** Grep the codebase for the relevant route/component so the ticket points whoever implements at a concrete file (`path:line`). Orientation only — don't fan out a `/triage`-style investigation; one or two pointers is enough.
- **Dedup check (mandatory, in order):**

  1. **Short-ID:** `.claude/scripts/jira-api search 'project = DEV AND text ~ "<SHORT-ID>"' 'summary,status' 10` — catches this exact feedback already filed by a prior run. Jira `text ~` is tokenized, so a short-ID query matches every ticket mentioning any `REACT-NATIVE-*` ID; a hit only counts if the ticket body actually carries this ID — confirm by reading, never by hit-count.
  2. **Prior feedback tickets:** `.claude/scripts/jira-api search 'project = DEV AND labels = user-feedback AND statusCategory != Done' 'summary,status' 20` — a different user reporting the same thing maps to the existing key.
  3. **Keywords:** `.claude/scripts/jira-api search 'project = DEV AND statusCategory != Done AND text ~ "<keywords>"' 'summary,status' 10` — feedback often overlaps prior tickets (DEV-200/DEV-201 came from earlier sweeps). If an _open_ ticket covers it, map to that key instead of drafting a duplicate.

- **Related-but-declined** — surface any closed/declined ticket that overlaps. Not a dupe (don't suppress the draft), but cite the key. Headless: note the key in the new ticket's body rather than deciding to revive anything.

## Step 3 — Approval gate (interactive) / rubric gate (headless)

**Interactive:** present the items as a table (Sentry ID · Summary · Type · Priority · New/Duplicate→KEY · Related), with dropped-junk and low-confidence items noted beneath so nothing is silently swallowed. **Do not file anything yet.** Wait for explicit sign-off; apply edits and re-show if changes are substantial.

**Headless:** no gate. An item is filed only if it passed the junk filter cleanly, has a concrete actionable ask, and dedup found no open match. Anything else is skipped with a one-line reason in the report. Enforce the ≤ 20 cap here, ordered by severity.

## Step 4 — File the tickets

For each approved (interactive) or rubric-clean (headless) item, `jira_create_issue` — project `DEV`, one at a time, **label `user-feedback`** via `additional_fields: {"labels": ["user-feedback"]}`. The label marks "filed from user feedback, not yet human-vetted" — tickets land in **To Do** and stay there until a human re-prioritizes (`labels = user-feedback` finds them all). Carry the research into the body — the Sentry URL and `Sentry: <SHORT-ID>` line, the `path:line` pointers, related/declined keys — so `/ticket` inherits the context instead of re-discovering it. For items that mapped to an existing key, don't refile; if the new feedback adds signal (new repro, another user), `jira_add_comment` on the existing ticket with the quote + Sentry URL. Collect resulting keys + URLs.

## Step 5 — Close the Sentry-side loop

Handled feedback must leave the inbox so the next run doesn't re-triage it. Via REST (short-ID → numeric id: `GET https://sentry.io/api/0/organizations/begifted/shortids/<SHORT_ID>/` → `.groupId`; don't name the shell var `GID` — reserved):

- **Filed or mapped to an existing open key** → `PUT https://sentry.io/api/0/organizations/begifted/issues/<numericId>/ {"status":"resolved"}`.
- **Junk** → `PUT ... {"status":"ignored"}` plus a note (`POST .../issues/<numericId>/notes/ {"text":"feedback triage: ignored as junk — <one-line reason>"}`) so it stops reappearing. If the notes endpoint fails, still ignore, but say so in the report.
- **Skipped (headless borderline) or over cap** → leave unresolved; it surfaces again next run.

Interactive mode does this too, after filing — there is no manual dashboard checklist anymore.

## Step 6 — Report

End with a summary block; every item pulled in Step 1 appears on exactly one line:

```
FEEDBACK RUN <date>
  filed:      DEV-xxx <summary> (REACT-NATIVE-X → resolved)
  duplicate:  REACT-NATIVE-Y → DEV-yyy (commented, resolved)
  junk:       REACT-NATIVE-Z (ignored — placeholder text)
  skipped:    REACT-NATIVE-W (borderline — <what a human should look at>)
  over cap:   REACT-NATIVE-V (carried to next run)
```

In dry-run mode, prefix with `DRY RUN — nothing was written` and phrase entries as `would file`, `would ignore`, etc.

## Notes

- **Interactive hard stop:** never file before Step 3 sign-off. Headless never waits — skip, don't stall.
- **Dedup is mandatory** — a duplicate is worse than a miss.
- **Account for everything pulled** — junk, skipped, over-cap, mapped-to-existing. If you cap or sample, say so; never let a partial pass read as "cleared the backlog."
- This skill produces tickets; it does not implement them. Hand a filed key to `/ticket <KEY>` after human review.
- Scheduling lives in `.claude/scripts/sentry-autofix-cron` (launchd `com.begifted.sentry-autofix`, weekday mornings): the wrapper runs `/sentry-autofix` first, then `/sentry-feedback-to-jira headless` from the bot clone.
