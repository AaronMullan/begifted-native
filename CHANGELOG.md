# Changelog

User-facing release notes for the BeGifted app. Each entry describes **what a
tester will actually notice**, not the technical change — enough that a
non-technical beta tester knows exactly what to check.

Entries are grouped by where they ship:

- **App** changes (React Native / JS) ride the next EAS build or OTA update
  (`eas update`) — they are **not** live on merge to `main`.
- **Backend** changes (edge functions, migrations) go **live on merge** to
  `main` via the auto-deploy workflows.

At release time, move the relevant **Unreleased** entries under a new dated
heading (e.g. `## 2026-06-15 — OTA`) and tag the release commit. Started
2026-06-13; changes merged before then are not backfilled here.

## Unreleased

### App (ships next build / OTA)

- The AI chats for adding a person or an occasion now recover from hiccups on
  their own: if a message fails to reach the assistant because of a brief
  network drop or a server blip, the app quietly retries a couple of times
  before giving up. If it still can't get through, you'll see a "Try again"
  button right above the message box so one tap re-sends — no more dead-end
  error pop-up that loses your place. The suggested-occasions step in the
  add-a-person flow gets the same auto-retry, so a momentary blip is less
  likely to fall back to generic birthday/holiday suggestions instead of the
  tailored ones (DEV-134).
- The gift-options drawer (the "…" menu on a gift idea) got a visual refresh:
  the colored icons next to each action are gone, replaced by a clean list with
  a small circle marker before each option. The product name at the top and the
  option labels now use the new teal type, and the grab handle is the beige
  pill. The eight actions and what they do are unchanged (DEV-175).
- On the **People** tab, the line under each person now shows their soonest
  upcoming moment as contextual status — e.g. "Birthday · June 26",
  "Anniversary · September 22", or "Mother's Day · May 10" — instead of always
  showing a static birthday. If multiple occasions are coming up, the nearest
  one wins; if there's nothing scheduled, it reads "No upcoming moments yet".
  Tapping a person still opens their profile (DEV-171).
- The account avatar at the top-right now shows two initials taken from your
  name (e.g. "Caspian Michalowski" → "CM") instead of a single letter from your
  email. Single-word names still show one initial, and it falls back gracefully
  if no name is set (DEV-168).
- The "Tell us how your recent moments went ›" link at the bottom of the
  **People** tab is gone — it was a leftover prompt that isn't part of the beta
  experience, and the list now ends cleanly with no empty gap (DEV-170).
- The bottom menu bar now sits a touch tighter — its icon-and-label row is a
  clean fixed height, while the gap above the home indicator at the bottom of
  the screen is preserved (the indicator never overlaps the tappable icons)
  (DEV-172).
- Removing the gift you're currently viewing on a recipient's **Gifts** tab no
  longer drops you into an empty list — the next gift idea now opens
  automatically in the main view, so it feels like "here's the next best idea"
  instead of the browsing flow ending. Applies to "Remove this idea", "Not for
  them", "They already have this", and "Product problem" (DEV-167).
- The bottom menu bar and top header now stay pinned in place at all times —
  they no longer slide away when you scroll down or reappear when you scroll up.
  Page content scrolls beneath them while both stay fixed and tappable (DEV-173).
- Home screen carousels (**Next Up** and **On the Horizon**) now show a
  consistent peek of the next card on every phone size — about 32pt of the
  following card is always visible, making it obvious you can swipe for more
  (DEV-162).
- Removing a gift from the feedback drawer on a recipient's **Gifts** tab now
  takes effect immediately and the gift stays gone — "Remove this gift", "Not
  for them", "They already have this", and "Product problem" all drop the gift
  and the list refills toward 3 (DEV-137).
- Possessive occasion names now display correctly — "Father's Day" no longer
  shows as "Father'S Day" (and the same fix covers "Mother's Day", "New Year's
  Day", etc.) on the Calendar, contact detail, and About-recipient screens
  (DEV-138).
- A recipient with no relationship saved no longer shows the word "null" on their
  About card — it now shows "—", and opening **Information** starts the
  Relationship field empty so you can type the real relationship and have it
  stick (DEV-139).

### Backend (live on merge)

- Adding a recipient without clearly stating your relationship to them no longer
  saves the literal word "null" as the relationship — the app now asks you to
  fill it in on the review screen instead (DEV-139).
