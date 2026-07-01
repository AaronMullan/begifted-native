---
name: sentry-feedback-to-jira
description: Turn Sentry user feedback into Jira tickets. Pulls the `issue.category:feedback` inbox, filters junk, classifies each genuine report (bug/UX/feature), dedups against open Jira, drafts tickets for review, files the approved ones, then prints a dashboard checklist of which feedback to resolve by hand. Use to clear the Sentry feedback backlog into tracked work. Implements the DEV-199 process.
---

# Sentry Feedback → Jira

Convert the Sentry **User Feedback** inbox into tracked Jira work, with one approval gate: you sign off on the **ticket drafts** before anything is filed. This is the lightweight path DEV-199 calls for — distinct from `/triage`, which root-causes **error clusters** (stack traces by volume). Feedback is human prose, not a crash, so this skill classifies and dedups rather than grepping the stack.

Argument (optional): a cap on items (e.g. `/sentry-feedback-to-jira 8`) or a lookback window (e.g. `30d`). Default: all unresolved feedback in the active project.

Defaults for this repo: org `begifted`, feedback project `4511361418395648`. Confirm with `mcp__sentry__find_projects` only if those don't resolve.

## Step 1 — Pull the feedback inbox

1. `mcp__sentry__search_issues` with `query: "issue.category:feedback is:unresolved"`, sorted by date. Capture issue short-ID (e.g. `REACT-NATIVE-X`), title, status, first/last seen.
2. For each item, `mcp__sentry__get_sentry_resource` (issue short-ID or URL) to read the **full feedback text** — the title is a summary; the body carries the concrete detail (which screen, what the user expected, repro). Draft from the body, not the title.

Keep each Sentry short-ID and URL — every ticket links back to it, and Step 5's resolve-checklist is keyed by short-ID.

## Step 2 — Filter junk, then extract

**Junk filter first.** Drop test/placeholder entries with no actionable content — "Blah blah blah", "Something bad happened", lorem-ipsum, empty bodies. When a report is borderline (vague but possibly real), keep it and flag it `low-confidence` in the table rather than silently dropping it. **Say how many you dropped and why** — never let a filtered item vanish unaccounted.

For each genuine item, draft:

- **Summary** — a tight, imperative title (the fix, not the complaint: "Show past occasions in calendar", not "Calendar is missing stuff").
- **Type** — Bug / UX / Story. A crash or wrong behaviour is a Bug; a rough-but-working interaction is UX; a "wish it could…" is a Story.
- **Priority** — your read of severity × reach. A reported crash outranks a copy nit.
- **Description** — what the user reported (quote the relevant feedback line), which screen/flow it concerns, and any acceptance criteria you can infer. Include the Sentry feedback URL as the source.
- **Locate the screen (light touch).** Grep the codebase for the relevant route/component so the ticket points whoever implements at a concrete file (`path:line`). This is orientation, not root-cause — don't fan out a `/triage`-style investigation; one or two pointers is enough.
- **Dedup check** — `jira_search` (project `DEV`) for an existing open ticket matching the item by keyword/signature **before** proposing a new one. Feedback often overlaps prior tickets (DEV-200/DEV-201 came from earlier sweeps) — if an _open_ one exists, map to that key instead of drafting a duplicate.
- **Related-but-declined** — also surface any closed/declined ticket that overlaps. Not a dupe (don't suppress the draft), but cite the key so the reviewer can decide whether to revive it.

## Step 3 — Show the draft, wait for approval

Present the items as a table (Sentry ID · Summary · Type · Priority · New/Duplicate→KEY · Related). Put dropped-as-junk and low-confidence items in a short note beneath the table so nothing is silently swallowed. **Do not file anything yet.** Wait for explicit sign-off. The user may drop, merge, edit, or re-prioritise — apply edits and re-show if the changes are substantial.

## Step 4 — File the approved tickets

For each approved item, `jira_create_issue` (project `DEV` unless told otherwise). Create them **one at a time** — `jira_batch_create_issues` is unreliable here. For items that mapped to an existing key, link rather than refile. Carry the research into the ticket body — the Sentry feedback URL, the `path:line` pointers, and any related/declined keys — so `/ticket` inherits the context instead of re-discovering it. Collect the resulting keys + URLs.

## Step 5 — Close the Sentry-side loop (manual)

**Our Sentry MCP token is read-only** (the `.env.local` `sntrys_` token is source-maps-only, no `event:*` scope — see DEV-199's token gap). So this skill **cannot** resolve or annotate feedback via API. Instead, print a checklist mapping each filed ticket back to its Sentry short-ID:

> Resolve these in the Sentry feedback dashboard now that they're tracked: `REACT-NATIVE-X → DEV-NNN`, …

The user marks them resolved by hand (or we mint a write-scoped token later, per DEV-199, and automate this step). Also list the junk entries to mark **ignored** so they stop reappearing in the inbox.

## Notes

- **One hard stop:** never file tickets before Step 3 approval. Everything else runs straight through.
- **Dedup is mandatory** — `jira_search` before filing. A duplicate is worse than a miss.
- Create issues **individually** with `jira_create_issue`; avoid `jira_batch_create_issues`.
- **Draft from the feedback body, not the title** — the title is a paraphrase; the body has the screen, the repro, the user's actual words.
- **Account for everything pulled** — junk dropped, low-confidence flagged, items mapped to existing keys. If you cap or sample the inbox, **say so**; never let a partial pass read as "cleared the backlog."
- Don't pass a `comment` argument to `jira_transition_issue` — it requires ADF, not plain text (relevant only if an item asks to move an existing ticket).
- This skill produces tickets; it does not implement them. Hand a filed key to `/ticket <KEY>` to do the work.
- This is the runnable half of DEV-199. The full process ticket also covers cadence (who sweeps, how often), optional Slack alerting on new feedback, and the write-token decision — settle those in DEV-199, not here.
