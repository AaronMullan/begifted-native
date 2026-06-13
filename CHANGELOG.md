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

### Backend (live on merge)

_None yet._
