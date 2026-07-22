# Findings: per-user exclusion list & custom notification timing

Feasibility notes on two product questions, gathered by reading the gift-generation
pipeline across both repos (`begifted-native` and the sibling `be-gifted`). Code
references are point-in-time; verify line numbers before acting.

## TL;DR

- **Exclusion list ("no candles" / "no amazon.com"): viable, mostly wired already.** An
  avoidance system exists, but it's _per-recipient_ and _item-title_ scoped. User-level
  scope and category/domain semantics are new. Domain exclusion is easy and deterministic;
  category exclusion is soft (depends on the model) and requires a prompt-text change.
- **Custom notification timing: already shipped.** Per-user `notification_lead_days`
  (7–60 days, presets 14/21/28) is live in Settings → Notifications and enforced by the
  daily cron. It's one global window per user — not per-occasion, not a multi-nudge cadence.

---

## 1. Per-user exclusion list

### Generation path

The real/current path is the **daily cron in the `be-gifted` repo**:
`app/api/cron/generate-gifts/route.ts` → `lib/services/gift-generation.ts`
(`generateAndStoreGifts` → `generateGiftsForRecipient`). It builds a CIS from DB, calls
the model with web search, validates URLs, dedupes, enriches images, persists to
`gift_suggestions`, notifies.

The edge function `begifted-native/supabase/functions/generate-gift-suggestions/index.ts`
is a thinner reimplementation and is **not invoked by any user-facing flow** — dormant.
Any exclusion work lands in the cron path.

### What already exists (favorable plumbing)

- **`recipients.avoid_list` (text[])** — per-recipient list, flows into `CIS.history.avoid`.
  Auto-populated by a trigger when a user gives negative feedback (the rejected gift's
  _title_ is appended). Migration: `be-gifted/supabase/migrations/003_add_recipient_fields.sql`;
  trigger: `begifted-native/.../20260510000002_gift_feedback_avoid_list_trigger.sql`.
- **`avoidSection` prompt slot** — `gift-generation.ts` (`buildAvoidSection`) injects "AVOID"
  blocks at generation time (already-suggested items; items suggested to others in the circle
  in the last 90 days).
- **`user_preferences` table** — keyed by `user_id`, already loaded during CIS build
  (`cis-builder.ts` `fetchGiverInfo`). Natural home for a _user-level_ list; wiring it into
  the CIS is small.
- **Domain-aware post-filter loop** — the production path already parses each suggestion's
  hostname (`normalizeUrl` / `extractDomains`) for dedupe. A domain exclusion drops in here.

### The two real gaps

1. **New semantics.** Everything today is item-title + per-recipient. Category ("candles"),
   domain ("amazon.com"), and user-level scope are all new.
2. **The prompt resists category avoidance.** The wrapper (`be-gifted/lib/prompts/beGiftedWrapper.ts`)
   currently says _"Avoiding broadly similar items is out of scope for now"_ and _"exclude only
   the exact item."_ To honor "no candles" the active `system_prompt_versions` row
   (`prompt_key = 'gift_generation_system'`) must be updated — the prompt is the source of truth.

### Recommended mechanism by exclusion type

| Exclusion                 | Mechanism                              | Why                                                                                                                                                       |
| ------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain** ("amazon.com") | Post-filter on suggestion URL hostname | Deterministic, cheap, reuses the dedupe loop. Don't trust the LLM to respect it.                                                                          |
| **Category** ("candles")  | Prompt / avoid-section                 | `category` is model-emitted free text and isn't persisted, so post-filtering is unreliable. Tell the model up front — needs the prompt-text change above. |

### Rough scope

- Add `excluded_domains text[]` / `excluded_categories text[]` to `user_preferences`
  (migration in `begifted-native` per the current dating scheme).
- Domain: enforce in the post-filter loop — low risk.
- Category: thread into `avoidSection` + update the active `system_prompt_versions` row;
  do a preview-run to confirm it doesn't over-reject.
- Settings UI to edit the list.

**Caveat for PM:** category exclusion is only as good as the model's own categorization —
soft ("mostly no candles"). Domain exclusion is hard.

---

## 2. Custom notification timing

**Already supported.** Per-user configurable gift-reminder lead time.

- **Storage:** `user_preferences.notification_lead_days` (integer, `NOT NULL DEFAULT 21`).
- **UI:** Settings → Notifications → "Gift reminder lead time"
  (`begifted-native/app/(tabs)/settings/notifications.tsx`). Presets **14 / 21 / 28**, plus a
  stepper for any value **7–60 days** (`LEAD_DAYS_MIN` / `LEAD_DAYS_MAX`).
- **Enforcement:** the daily cron reads each user's `notification_lead_days` and only
  generates/notifies when `daysUntil <= leadDays` (falls back to 21 if unset).
  `be-gifted/app/api/cron/generate-gifts/route.ts`.

So "1 week / 2 weeks" is reachable: users can pick 7 up to ~60 days.

### Limits (not yet supported)

- **One global window per user** — not per-occasion or per-recipient (can't do "2 weeks for
  birthdays, 1 month for anniversaries").
- **A lead _window_, not a schedule** — controls how far ahead a gift is generated/notified;
  not a recurring "remind me every X days" or multi-nudge cadence. One trigger per occasion.
- **Presets are 14/21/28** — "1 week" is reachable via the stepper (min 7) but isn't a one-tap
  preset.

### Migration footnote

The column had a recorded-but-not-applied migration, then was re-shipped idempotently in
`begifted-native/.../20260605000001_readd_notification_lead_days.sql`. When verifying live,
check `information_schema`, not just the migrations list.
