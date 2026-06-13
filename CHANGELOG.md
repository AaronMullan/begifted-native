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
