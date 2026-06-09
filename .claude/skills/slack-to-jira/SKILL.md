---
name: slack-to-jira
description: Turn a Slack message into Jira tickets. Paste a Slack message link; Claude reads the message (and its thread), extracts actionable items, drafts tickets for review, files the approved ones, then drafts and (on approval) posts a Slack reply linking the new tickets. Use when a Slack thread needs to become tracked work.
---

# Slack → Jira

Convert a Slack discussion into tracked Jira work, with two approval gates: you sign off on the **ticket drafts** before anything is filed, and on the **Slack reply** before anything is posted.

Argument: a Slack message permalink (e.g. `https://<workspace>.slack.com/archives/C0ABCDEF/p1700000000123456`). If none is given, ask for one before proceeding.

## Step 1 — Read the source

1. Parse the permalink into a **channel ID** (the `C…`/`G…` segment after `/archives/`) and a **thread timestamp** (the `p1700000000123456` → `1700000000.123456`).
2. Read the full context with `slack_read_thread` (channel + thread_ts). If the link points at a standalone message with no thread, fall back to `slack_read_channel` around that ts.
3. Resolve author display names with `slack_read_user_profile` where the messages only carry user IDs, so the ticket drafts and reply read in plain English.
4. **Pull any attached images by default** — if a message carries an image/file (e.g. a screenshot), read it with `slack_read_file` and fold what it shows into the relevant ticket. Screenshots usually contain the concrete detail (the exact error, the bloated output, the bad UI) that sharpens a draft. Only skip if the attachment is plainly irrelevant (an emoji, a meme).

Keep the permalink — every ticket links back to it, and the reply is posted into this thread.

## Step 2 — Extract actionable items

Pull out only **actionable** items — bugs, feature requests, concrete decisions, follow-ups with an owner. Skip chatter, acknowledgements, and already-resolved points. For each item draft:

- **Summary** — a tight, imperative title.
- **Type** — Bug / Task / Story.
- **Priority** — your read of severity/urgency from the thread.
- **Description** — what's being asked, who asked, and any acceptance criteria stated in the thread. Include the Slack permalink as the source.
- **Dedup check** — `jira_search` for an existing open ticket matching the item (by keywords / signature) **before** proposing a new one. If an _open_ one exists, map to that key instead of drafting a duplicate.
- **Related-but-declined** — also surface any closed/declined ticket that overlaps in scope. It's not a dupe (don't suppress the draft), but it's useful context: cite the key so the reviewer can decide whether to revive it instead of filing fresh.

## Step 3 — Show the draft, wait for approval

Present the items as a table (Summary · Type · Priority · New/Duplicate→KEY · Related). The **Related** column carries any closed/declined ticket that overlaps (from Step 2), so the reviewer sees prior art at a glance. **Do not file anything yet.** Wait for explicit sign-off. The user may drop, merge, edit, or re-prioritise items — apply their edits and re-show if the changes are substantial.

## Step 4 — File the approved tickets

For each approved item, create the ticket with `jira_create_issue` (project `DEV` unless told otherwise). Create them **one at a time** — `jira_batch_create_issues` is unreliable here. For items that mapped to an existing key, link rather than refile. Collect the resulting issue keys + URLs.

## Step 5 — Draft the Slack reply, wait for approval

Draft a concise reply for the thread: a one-line acknowledgement plus a bullet per filed ticket (`KEY — summary` with its URL), and a note for any item intentionally not filed. Use `slack_send_message_draft` (or just print it). **Show it and wait for approval.** Do not post yet.

## Step 6 — Post

On approval, post the reply **into the original thread** with `slack_send_message` (channel + thread_ts from Step 1), so it threads under the source message rather than landing in the channel root.

## Notes

- **Two hard stops:** never file tickets before Step 3 approval, never post before Step 5 approval. Everything else runs straight through.
- **Dedup is mandatory** — `jira_search` before filing. A duplicate is worse than a miss.
- Create issues **individually** with `jira_create_issue`; avoid `jira_batch_create_issues`.
- Don't pass a `comment` argument to `jira_transition_issue` — it requires ADF, not plain text. (Relevant only if a thread item asks to move an existing ticket.)
- Post the reply as a **threaded** message (pass `thread_ts`), not a new channel message.
- If the thread is long or spans sub-threads and you only processed part of it, **say so** — never let a partial pass read as "captured everything."
- This skill produces tickets; it does not implement them. Hand a filed key to `/ticket <KEY>` to do the work.
