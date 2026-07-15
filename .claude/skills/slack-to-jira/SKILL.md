---
name: slack-to-jira
description: Turn Slack messages into Jira tickets. Two modes — paste a message link for the interactive flow (reads the thread, drafts tickets for review, files approved ones, leaves a reply draft), or pass `sweep <#channel>` for the unattended daily sweep (reads recent channel messages, files rubric-clean bug reports labeled `team-feedback`, marks handled messages with a ✅ reaction). Use when a Slack thread needs to become tracked work, or on the weekday schedule against #bugs.
---

# Slack → Jira

Convert a Slack discussion into tracked Jira work. Two modes:

- **Interactive (default):** a message permalink, with two approval gates — you sign off on the **ticket drafts** before anything is filed, and on the **Slack reply** before the draft is created in Slack. The reply is always left as a Slack **draft** for the user to send themselves — never posted directly.
- **Sweep (unattended):** `sweep <#channel>` — scan a channel's recent messages for bug reports and file them without approval. See **Sweep mode** below.

Argument (interactive): a Slack message permalink (e.g. `https://<workspace>.slack.com/archives/C0ABCDEF/p1700000000123456`). If none is given (and this isn't a sweep), ask for one before proceeding.

## Step 1 — Read the source

1. Parse the permalink into a **channel ID** (the `C…`/`G…` segment after `/archives/`) and a **thread timestamp** (the `p1700000000123456` → `1700000000.123456`).
2. Read the full context with `slack_read_thread` (channel + thread_ts). If the link points at a standalone message with no thread, fall back to `slack_read_channel` around that ts.
3. Resolve author display names with `slack_read_user_profile` where the messages only carry user IDs, so the ticket drafts and reply read in plain English.
4. **Pull any attached images by default** — if a message carries an image/file (e.g. a screenshot), read it with `slack_read_file` and fold what it shows into the relevant ticket. Screenshots usually contain the concrete detail (the exact error, the bloated output, the bad UI) that sharpens a draft. Only skip if the attachment is plainly irrelevant (an emoji, a meme). **Keep the file/permalink handle** so the actual image can be attached to the ticket in Step 4 — a transcription helps the draft, but whoever picks up the ticket (e.g. `/ticket`) needs to re-see the real UI/error, not just your paraphrase.

Keep the permalink — every ticket links back to it, and the reply draft is attached to this thread.

## Step 2 — Extract actionable items

Pull out only **actionable** items — bugs, feature requests, concrete decisions, follow-ups with an owner. Skip chatter, acknowledgements, and already-resolved points. For each item draft:

- **Summary** — a tight, imperative title.
- **Type** — Bug / Task / Story.
- **Priority** — your read of severity/urgency from the thread.
- **Description** — what's being asked, who asked, and any acceptance criteria stated in the thread. Include the Slack permalink as the source.
- **Dedup check** — search Jira via REST for an existing open ticket matching the item (by keywords / signature) **before** proposing a new one. If an _open_ one exists, map to that key instead of drafting a duplicate:

  ```bash
  .claude/scripts/jira-api search 'project = DEV AND statusCategory != Done AND text ~ "<keywords>"' 'summary,status' 10 \
    | jq '.issues[] | {key, summary: .fields.summary, status: .fields.status.name}'
  ```

- **Related-but-declined** — also surface any closed/declined ticket that overlaps in scope. It's not a dupe (don't suppress the draft), but it's useful context: cite the key so the reviewer can decide whether to revive it instead of filing fresh.

## Step 3 — Show the draft, wait for approval

Present the items as a table (Summary · Type · Priority · New/Duplicate→KEY · Related). The **Related** column carries any closed/declined ticket that overlaps (from Step 2), so the reviewer sees prior art at a glance. **Do not file anything yet.** Wait for explicit sign-off. The user may drop, merge, edit, or re-prioritise items — apply their edits and re-show if the changes are substantial.

## Step 4 — File the approved tickets

For each approved item, create the ticket with `jira_create_issue` (project `DEV` unless told otherwise). Create them **one at a time** — `jira_batch_create_issues` is unreliable here. For items that mapped to an existing key, link rather than refile. Collect the resulting issue keys + URLs.

**Carry the research into the ticket — don't leave it in the review table.** The prior art and screenshots you dug up in Steps 1–2 must survive the handoff, or `/ticket` re-discovers (or loses) them:

- **Related/declined tickets** — write the keys into the Description (or attach them as Jira issue links). The reviewer saw them in the Step 3 table; the ticket body did not. Cite each as prior art so whoever implements inherits the context for free.
- **Screenshots** — attach the actual image to the ticket, not just the transcription. Save the Slack file to a local path, then pass that path via the `attachments` param on `jira_create_issue` (or `jira_update_issue` for an existing key). A paraphrase sharpens the draft but can't be re-examined when scoping the fix.

## Step 5 — Draft the Slack reply, wait for approval

Compose a concise reply for the thread: a one-line acknowledgement plus a bullet per filed ticket (`KEY — summary` with its URL), and a note for any item intentionally not filed. **Print it in the conversation and wait for approval.** Do not touch Slack yet.

## Step 6 — Create the Slack draft

On approval, create the reply as a **Slack draft** with `slack_send_message_draft` (channel + `thread_ts` from Step 1, so it attaches to the source thread, not the channel root). **Never use `slack_send_message`** — sending directly stamps a "sent by Claude" annotation on the message; a draft the user sends themselves is the only known way to avoid it. Tell the user the draft is waiting in Slack's Drafts & Sent for them to send.

## Sweep mode (unattended)

`sweep <#channel|C…-id> [lookback] [dry-run]` — the daily headless pass the launchd wrapper runs against **#bugs** (`C0B96TUSCUC`). Never waits for input: rubric-clean bug reports are filed straight to To Do; anything borderline is skipped and reported, never filed. `dry-run` executes everything with zero writes (no tickets, no reactions), printing what each write would have been.

Defaults: lookback **3d** (covers a weekend or a failed run — the ✅/permalink dedup makes overlap harmless). Cap: **≤ 10 new tickets per run** — a runaway guard; over-cap messages stay unreacted and get picked up next run.

Flow, reusing the interactive steps' craft (thread reading, image pulling, dedup discipline, carry-research-into-the-ticket):

1. **Preflight:** confirm the Slack MCP tools respond (e.g. resolve the channel). If Slack is unreachable, print `SWEEP ABORT: <reason>` and stop — never fake an empty sweep.
2. **Scan:** `slack_read_channel` over the lookback window. For each **root message**, skip immediately if it already carries a ✅ (`white_check_mark`) reaction — that's the "already ticketed" mark from a prior run. Also skip joins, bot notices, and pure chatter/acknowledgements.
3. **Read fully:** for messages with replies, `slack_read_thread` — the thread often carries the repro or a "never mind, fixed". A thread that resolves itself is chatter, not a ticket. Pull attached screenshots per Step 1.4.
4. **Rubric gate (replaces Step 3's approval):** file only if the message is a concrete, actionable bug/request with no open Jira match. Borderline (vague, can't tell if it's a bug, unclear ask) → **skip and report** — a teammate can run the interactive flow on it later. Filing guesses unattended is worse than a one-day delay.
5. **Dedup (mandatory, in order):** first search for the message's own ts token (`text ~ "p<ts-digits>"`) to catch a prior run's ticket whose reaction failed; then `labels = team-feedback AND statusCategory != Done`; then the keyword search from Step 2. Confirm hits by reading, never by hit-count.
6. **File:** `jira_create_issue`, one at a time, **label `team-feedback`** via `additional_fields: {"labels": ["team-feedback"]}`. The label marks "filed by automation, not yet human-vetted"; tickets land in To Do until a human re-prioritizes. Body carries the Slack permalink on its own line, the reporter's name, the quoted report, screenshots attached, and one or two `path:line` pointers (light touch — orientation, not root cause). If the item maps to an existing open key, `jira_add_comment` there with the quote + permalink instead of refiling.
7. **Mark:** add a ✅ reaction (`slack_add_reaction`, `white_check_mark`) to the root message for every item filed or mapped to an existing key. If the reaction call fails, still count the ticket but say so in the report — the ts-token dedup is the backstop. Reactions are the **only** Slack write allowed in sweep mode: never `slack_send_message`, never `slack_send_message_draft`.
8. **Report** — every scanned root message on exactly one line:

   ```
   SLACK SWEEP #bugs <date>
     filed:     DEV-xxx <summary> (<permalink> ✅)
     duplicate: <permalink> → DEV-yyy (commented, ✅)
     chatter:   <permalink> (thread self-resolved)
     skipped:   <permalink> (borderline — <what a human should look at>)
     already ✅: <n> messages
   ```

   In dry-run mode, prefix with `DRY RUN — nothing was written` and phrase entries as `would file`, `would react`, etc.

Sweep hard rails: tickets, comments, and ✅ reactions only — no Slack messages or drafts, no branches/commits/PRs, no DB writes. Skip, don't stall.

## Notes

- **Two hard stops:** never file tickets before Step 3 approval, never create the Slack draft before Step 5 approval. Everything else runs straight through.
- **Dedup is mandatory** — search before filing. A duplicate is worse than a miss.
- **Jira reads vs writes:** reads/searches via `.claude/scripts/jira-api` (REST + `jq`, filtered fields); writes (`jira_create_issue`, `jira_update_issue`, links) stay on the Jira MCP.
- Create issues **individually** with `jira_create_issue`; avoid `jira_batch_create_issues`.
- Don't pass a `comment` argument to `jira_transition_issue` — it requires ADF, not plain text. (Relevant only if a thread item asks to move an existing ticket.)
- The reply is always a **draft** (`slack_send_message_draft`), always **threaded** (pass `thread_ts`) — never `slack_send_message`, which adds a "sent by Claude" annotation.
- Slack allows only one attached draft per channel — if `draft_already_exists` comes back, tell the user to send or delete the existing draft rather than retrying.
- If the thread is long or spans sub-threads and you only processed part of it, **say so** — never let a partial pass read as "captured everything."
- This skill produces tickets; it does not implement them. Hand a filed key to `/ticket <KEY>` to do the work.
