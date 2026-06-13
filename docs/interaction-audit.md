# BeGifted — User-Interaction Audit

_Last updated: 2026-06-09. Method: three parallel code explorations across all user-facing flows, plus direct spot-checks of headline findings. Status legend: ✅ works · ⚠️ partial · 🔴 stubbed/no-op · ❌ missing._

## Why this exists

A clear picture of what a user _should_ be able to do across the app versus what is actually wired up today — to inform roadmap/prioritization ahead of TestFlight feedback from non-technical beta testers (who need discoverable flows). Prompted in part by a 2026-06-08 Slack thread (Caspian, #design) reporting that users cannot add a new gifting occasion — verified here and filed as DES-5 / DEV-154.

## Summary

The core flow — add a person → AI conversation → review → save → view AI gift suggestions → give feedback — is genuinely complete and well-instrumented with loading/error/empty states. Gaps cluster in three areas: **account recovery**, **support/billing surfaces**, and **occasion management + quality-of-life interactions** (search, recurrence, bulk import).

**Critical gaps (filed as tickets where actioned):**

| Gap                                                               | Severity   | Ticket                                                    |
| ----------------------------------------------------------------- | ---------- | --------------------------------------------------------- |
| Can't add an occasion to an existing recipient from their profile | 🔴 Blocker | [DES-5](https://be-gifted.atlassian.net/browse/DES-5)     |
| Home occasion overflow 3-dot menu is a no-op `console.log`        | 🔴 Major   | DEV-70 (pre-existing)                                     |
| Support & Help screen is a "Coming Soon" dead-end                 | 🔴 Major   | [DES-6](https://be-gifted.atlassian.net/browse/DES-6)     |
| Billing & Subscription screen is a "Coming Soon" dead-end         | 🔴 Major   | _deferred_                                                |
| FAQ screen built but unreachable (no nav path)                    | ❌ Major   | [DEV-153](https://be-gifted.atlassian.net/browse/DEV-153) |
| No password reset / resend-verification                           | ❌ Major   | [DES-7](https://be-gifted.atlassian.net/browse/DES-7)     |
| Occasions have no recurrence (all one-time)                       | ❌ Major   | [DEV-154](https://be-gifted.atlassian.net/browse/DEV-154) |

## Interaction map

### Entry / Auth

`app/index.tsx`, `app/intro/*`, `components/Auth.tsx`, `components/intro/*`, `hooks/use-auth.ts`

- ✅ 3-slide intro swiper + "sign me up" CTA; sign up (name/email/password, 6-char min, duplicate detection, "check your inbox" email-verify, server-side signup disable via app config); sign in; sign out; auth-state routing (intro gate → auth → onboarding/dashboard) with navigation-loop guard.
- ❌ **Forgot/reset password** — no link or flow (→ DES-7).
- ❌ **Resend verification email** — none (→ DES-7).
- ❌ Change email post-signup; social auth; TOS/privacy links.
- ⚠️ `components/Account.tsx` (username/website/avatar editor) is unreachable dead code.

### Onboarding

`app/onboarding/*`, `hooks/use-add-recipient-flow.ts`, `hooks/use-conversation-flow.ts`

- ✅ welcome → identity (self-description, triggers `extract-user-preferences` + `synthesize-giver-profile`, **skip** available) → confirmation → recipient choice (add manually / import contacts; both set `onboarding_completed`). Loading + try/catch error handling throughout.
- ❌ No back navigation between steps (forward-only by design); no edit-your-own-description entry after onboarding except Settings → Gifting.

### Contacts / Recipients

`app/(tabs)/contacts/*`, `components/contacts/*`, `components/recipients/*`, `ContactPicker`, `ContactFileImport`, recipient hooks

- ✅ List w/ empty + loading states; add manually; import single device contact (permission intro → picker, prefills name/birthday/address/photo); web CSV/JSON import; multi-step AI add flow (conversation → manual fallback → data review → occasions selection → success); per-card 3-dot menu (edit / view gifts / delete w/ confirm); detail screen Gifts + Details tabs; field-level edits (interests, address, budget, tone) via modals; "update what we know" AI chat; profile resync.
- ✅ Occasions section lists each occasion with a per-card Edit/Delete menu (`AboutRecipientView.tsx:162–209`).
- 🔴 **No "+ Add occasion" affordance in the recipient profile** (`AboutRecipientView.tsx:162–209` renders existing cards + Edit/Delete only). The _only_ add paths are the Calendar tab → recipient picker → `/contacts/{id}?addOccasion=true` (which opens an AI chat, `useAddOccasionFlow`) and initial recipient creation — neither discoverable from the profile (→ DES-5).
- ❌ Search/filter recipients; sort; bulk/import-all contacts; duplicate-contact detection; archive/soft-delete; recipient grouping/categories; simple non-AI edit form; export.

### Dashboard / Home

`app/(tabs)/dashboard.tsx`, `components/home/*`

- ✅ Hero card tap → recipient; NextUp + OnTheHorizon carousel cards → `/gifts/{recipientId}`; AddPeopleTile (import / manual / web) full flow; loading + empty states.
- 🔴 **`OccasionOverflowButton` 3-dot menu → only `console.log`** (`components/home/OccasionOverflowButton.tsx:18-19`, TODO DEV-70). Visible affordance, nothing happens on tap.
- ⚠️ `HomeHeroCard` TODO DEV-69 (`HomeHeroCard.tsx:32`) — routes to contact page rather than the occasion's gift page.
- ⚠️ `RecentMomentsLink` accepts `onPress` but dashboard never passes one.

### Gifts

`app/gifts/[id].tsx`, `components/gifts/*`, `use-gift-suggestions.ts`, `use-submit-gift-feedback.ts`

- ✅ Primary/collapsed cards; expand/collapse; "View Product" → in-app browser (`lib/open-link.ts`); occasion filter; gift action drawer (8 feedback actions: keep_in_mix, chose, already_have, not_for_them, price_off, product_problem, remove, free-text gift_feedback → `lib/api.ts:313-327`); optimistic remove + backfill polling; error snackbar; empty/loading states.
- ❌ Share gift; wishlist distinct from "keep in mix".
- ⚠️ Backfill polling stops silently after ~5 tries / ~50s with no "refreshing" indicator or retry.

**On "buying" gifts (deliberately not a gap).** Today the model is _BeGifted suggests, the retailer transacts_: "View Product" opens the retailer's own page in an in-app browser and logs an outbound click (`lib/api.ts:431` notes this is a CTA click, "not a purchase-conversion metric"). True in-app checkout is **not** a missing feature to "fill" — it's a business-model decision with very different cost tiers, so we frame it as a roadmap choice, not a bug:

- **Affiliate monetization (low effort, recommended next step):** add Amazon Associates / retailer affiliate tags to the existing click-out. The DEV-151 outbound-click logging is already the attribution foundation. Revenue with zero fulfillment burden; keeps the suggest-then-hand-off model intact.
- **Amazon-flavored "in-app feel" (medium):** constrain suggestions to Amazon via the Product Advertising API for live price/availability + "add to cart" with an affiliate tag; checkout still completes on Amazon.
- **Embedded checkout / become a merchant (high → very high, company-shaping):** a commerce subsystem (catalog, orders, payments/PCI, shipping, returns, tax nexus, fraud, support) plus a fulfillment partner or merchant-of-record. Only justified if commerce becomes the business model.

Note: Apple/Google IAP (StoreKit) does **not** apply — those are for digital goods and physical-goods sales are required to use ordinary payment rails (no 30% platform tax). The real constraint is the catalog: gift `link`s are AI-generated across arbitrary retailers (`product_url` / `retailer_domain` / `platform` in `lib/api.ts`), so there is no single checkout to embed without first constraining suggestions to a sellable catalog.

### Occasions & Calendar

`app/(tabs)/calendar.tsx`, `use-occasion-*`, `components/recipients/conversation/Occasion*`

- ✅ Enable/disable toggle; AI recommendations + "also consider" chips; create/update/delete mutations; calendar = month-grouped list w/ days-until; tap → recipient gifts; long-press → delete-confirm; "Add Occasion" → recipient picker → AI-chat add flow.
- ⚠️ **"Edit Occasion" modal is date-only** (`OccasionEditor.tsx`): occasion type read-only; no fields for repeat/recurrence, "what BeGifted should help with", or note. `onSave` passes only a date string.
- ❌ **Recurrence / repeat setting** (all occasions one-time) (→ DEV-154); **year-optional-for-annual vs year-required-for-one-time logic**; **"what to help with" + note fields**; **user-added-occasion-is-authoritative protection** (no flag preventing AI from overwriting user-entered occasions); per-occasion reminder lead override; interactive calendar/date-picker widget (list only); occasion series/bulk edit; add-occasion shortcut from home.

### Notifications

`app/(tabs)/notifications.tsx`, `use-notifications.ts`, `use-push-notifications.ts`

- ✅ Feed list; unread styling; tap → recipient (+occasion filter) & marks read; mark-all-read button + auto-mark-on-view; badge sync on resume; 30s unread poll; push setup (device check, permission request, token register on login / unregister on logout, foreground display, deep-link on tap, Android channel).
- ❌ Per-notification mute/snooze; grouping; archive/history; in-banner rich actions; no UI fallback/indicator if push permission denied (silent request at startup); failed token registration only logged.

### Settings & chrome

`app/(tabs)/settings/*`, `components/MenuCard.tsx`, `Header.tsx`, `BottomNav.tsx`, profile/preference hooks

- ✅ Settings hub (5 cards) + sign out; **Profile** (name, city, state save; email read-only; resync trigger); **Gifting** (free-text style → `extract-user-preferences` + giver-profile resync, floating save); **Notifications prefs** (push/email/feedback/system/promo toggles, timezone, gift-reminder lead-time stepper+chips, all persist to `user_preferences`); Header (logo→dashboard, bell+badge→notifications, avatar→settings); BottomNav (Home/People/Moments).
- 🔴 **`settings/billing.tsx` "Coming Soon"** — no subscription/payment (deferred).
- 🔴 **`settings/support.tsx` "Coming Soon"** — no contact/report (→ DES-6).
- ❌ **`app/faq.tsx` is fully implemented but has zero navigation paths** (verified: no `/faq` push/navigate anywhere). The Support placeholder even promises "browse FAQs" (→ DEV-153).

## Filed tickets

- [DES-5](https://be-gifted.atlassian.net/browse/DES-5) — Recipient profile "+ Add occasion" action + Add Occasion modal (↔ DEV-154)
- [DES-6](https://be-gifted.atlassian.net/browse/DES-6) — Design the Support & Help screen (↔ DEV-153)
- [DES-7](https://be-gifted.atlassian.net/browse/DES-7) — Account recovery: forgot-password + resend verification
- [DEV-153](https://be-gifted.atlassian.net/browse/DEV-153) — Wire the orphaned FAQ screen into navigation
- [DEV-154](https://be-gifted.atlassian.net/browse/DEV-154) — Occasion recurrence (model + UI)

Not filed: home occasion-overflow menu (covered by pre-existing DEV-70); Billing screen (deferred pending payments-provider decision).
