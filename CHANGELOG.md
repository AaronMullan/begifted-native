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
2026-06-13; the prior **Build 45** release (2026-06-12) was backfilled
retroactively so testers have notes for what they're already running. Earlier
builds (≤ 44) are not backfilled here.

## Unreleased

### App (ships next build / OTA)

- VoiceOver now reads the −/+ lead-day buttons in Settings → Notifications (the control that sets how many days ahead you get gift ideas). It announces them as "Decrease lead days" / "Increase lead days" buttons instead of staying silent, and the checkmark on the currently selected timezone now reads as "Selected" — so the screen is usable with a screen reader (DEV-202).
- The gift feedback sheet (the options that slide up when you tap a gift idea) now matches the agreed design: six tappable options instead of eight. "Remove this idea" and the separate "Gift feedback >" note row are gone. Tapping an option records it right away — nothing extra is required. Most options then offer an optional note you can fill in or Skip ("I chose this gift", "They already have this", "Not for them", "Product problem"), "Price feels off" adds quick-pick chips (Too expensive / Too cheap / Not worth the price / Budget changed) plus an optional note, and "Keep this in the mix" needs no follow-up. Removing a gift via "Not for them" / "Price feels off" / "They already have this" / "Product problem" still refreshes your list with a new idea as before (DEV-196).
- From the Moments calendar, the "Add to this day" / "Add Moments" picker now has an "Add a new person" option, so you can create someone who isn't in BeGifted yet right from the calendar — no more bailing out to the People tab first. (Previously the picker only listed existing recipients, and the empty state was a dead-end telling you to add a recipient elsewhere.) (DEV-200).
- A very long gift title on an opened gift card no longer runs into the expand chevron in the top-right corner. Long titles now wrap and trim cleanly within the card instead of colliding with the arrow (DEV-201).
- More gift ideas now show their product photo. Previously a card could come back image-less even when a photo was available — a too-strict size check and a separate, flaky image probe were quietly dropping valid photos (e.g. ones a retailer served slowly or that were a touch under the old size cutoff). Cards still stay the same height while a photo loads and cleanly show no image when there genuinely isn't one. Behind the scenes we now record why each card did or didn't show a photo, so we can tell "the gift had no photo" apart from "the photo failed to load" and catch any future drop quickly (DEV-186). (the sheet that slides up when you tap a gift idea's options) now matches the finalized design: the feedback options are a clean text list with "Keep this in the mix" emphasized at the top (the placeholder dot in front of each option is gone), the rows sit on a tighter line spacing, and the "Send" control on the "Gift feedback" note screen is now a gold outlined up-arrow instead of a solid paper-plane button (DEV-190).
- On a recipient's gift ideas screen, the expand chevrons inside the "Past Gift Recommendations" section are now dark teal instead of gold, so past suggestions read as visually distinct from the current gold-chevron recommendations above them (DEV-189).
- The Moments calendar now has a year view. Tap the gold chevron next to the month name to zoom out to all 12 months at once, each as a tiny calendar showing where your moments fall across the year (with the same per-person colored dots). Tap any month to drop straight into it, or tap the gold chevron next to the year to collapse back (DEV-193).
- The Moments tab is now an actual calendar instead of a long list. It opens on the current month with a Monday-first grid: today is circled in gold, and any day with a moment shows a small colored marker beneath it (each person keeps the same color, so you can tell at a glance whose occasion it is — one bar for a single moment, a row of dots for several). Tap a day to open it: the screen shows that date with a card for each person who has a moment then (tap their card to jump to gift ideas), plus an "Add to this day" button. Use the ‹ › arrows to move between months, or tap the gold chevron next to the month name to zoom out to the year (DEV-192). the "NEXT UP" and "ON THE HORIZON" section labels now sit tighter to their cards and the row above them (the extra empty space is gone), are nudged in slightly, and the date line on the cards (e.g. "Tomorrow • June 19") now uses a rounder bullet separator (DEV-188).
- Tapping a gift idea now scrolls that card to a consistent spot just below the header so its title, price, and "View Product" link are immediately visible — no more hunting for where the opened card went. Cards with a product photo also no longer jump after the image loads, and cards without a photo behave the same way (DEV-185).
- The bottom navigation icons now match the finalized design: Home shows an outlined house, People a filled pair, and Moments a calendar with date dots. The Home/People/Moments labels also use the app's new DM Sans font.
- You can now report a bug from anywhere in the app. The header at the top of every screen now has a bug icon (where the notification bell used to be) that opens the bug-report form, so you no longer have to navigate back to Home to report something that goes wrong mid-flow. The notification bell has been removed from the header (DEV-183).
- The "Past Gift Recommendations" label at the bottom of a recipient's gift ideas screen is now a tappable header. Tap it to reveal past suggestions as full gift cards (with photo, price, "Why This Fits", and a "View Product" link) on a slate-blue background. Tap it again to collapse them. One gift card at a time can be open across both the current and past suggestions (DEV-182).
- The "Add a screenshot" button in the bug report form now actually opens your photo library so you can attach a screenshot. Tapping it previously did nothing (DEV-184).
- The intro screens no longer show the "SIGN ME UP!" button until the final slide, so the app's value proposition plays out before you can jump straight to sign-up (DEV-181).
- You can now report a bug from inside the app. There's a "Report a Bug" item
  at the bottom of the Home screen and in Settings, and if the app ever hits an
  error screen you'll get a "Tell us what happened" button right there. Each
  opens a short form where you can describe the problem and attach a
  screenshot — it sends straight to the team with the technical details already
  attached, so there's no need to explain anything technical (DEV-96).
- A recipient's birthday now reads in the everyday "Month Day, Year" style
  (e.g. "November 13, 1946", or just "August 18" when the year is unknown)
  everywhere you see or edit it — including the Information edit dialog and the
  review-details step when adding someone. It no longer shows the raw
  "1946-11-13" form. You can type the date back in the same friendly way (or as
  numbers); it still saves correctly (DEV-178).
- When you add a person with a photo (e.g. imported from a contact), the photo
  upload now quietly retries once if a brief network drop interrupts it. Before,
  a momentary blip could save the person with no photo and no warning. The photo
  still saves the same way when the connection is fine (DEV-177).
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
- Tapping "Gift feedback" in that drawer now opens a cleaner single text box: a
  large rounded field outlined in teal with a small round gold send button
  tucked into its bottom-right corner. The old title, helper line, and
  full-width "Send feedback" button are gone. The send button stays dimmed until
  you type something. Your feedback is saved exactly as before (DEV-176).
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

- Finishing the "add an occasion" chat no longer dead-ends with an "Error" alert
  when the occasion can't be auto-detected. If the behind-the-scenes step that
  reads the occasion type and date hiccups, the occasion now still saves (as a
  generic occasion with a placeholder date you can adjust) instead of failing
  silently and losing what you typed (DEV-198).
- A recipient's active Gift Ideas no longer show the same product twice. When two
  rounds of suggestions land close together — for example after removing a couple
  of gifts in quick succession, or when the daily refresh runs — the app now skips
  any product that's already in the list instead of stacking a second copy. A fresh
  round of suggestions only counts as ready when it has a full set of three unique
  gifts (DEV-187).
- Groundwork for recording Terms & Privacy acceptance: the backend can now store
  which legal-document versions each user agreed to, with a trustworthy
  server-stamped time and IP. There's nothing for testers to see yet — the
  sign-up screen that will use it ships in a later ticket (DEV-142).
- Adding a recipient without clearly stating your relationship to them no longer
  saves the literal word "null" as the relationship — the app now asks you to
  fill it in on the review screen instead (DEV-139).

### Backend (live on merge)

- Finishing an "add an occasion" chat now actually saves the occasion. The
  assistant would confirm the occasion and show the save button, but the final
  save silently failed every time and the occasion was dropped. It now goes
  through and the new moment appears on the recipient and in your calendar
  (DEV-194).

## 2026-06-12 — Build 45 (TestFlight)

The release testers are currently running (iOS production build 45, cut at
commit `93778bc`). These notes are backfilled — none of this was announced at
the time.

### App

- The **Gift Ideas** list on a recipient was redesigned: it now leads with the
  three newest suggestions and tucks everything older under a **Past Gifts**
  section. Tapping an idea expands it in place (an accordion) rather than
  navigating away, so you can scan and open ideas without losing your spot
  (DEV-165).
- Occasions can now be set to **repeat yearly** or be **one-time**. Editing an
  occasion shows a "Repeats yearly / One-time" toggle: yearly occasions only
  need a month and day (the app rolls them forward to the next occurrence),
  while one-time occasions take a full date. The setting shows on the occasion
  card (DEV-154).
- **Settings** now has an **FAQ** entry with the approved beta FAQ copy, so you
  can find answers to common questions without leaving the app (DEV-153).
- The primary button on a gift card now reads **"Get this gift ›"** instead of
  "View Product ›" (DEV-150).
- Tapping a gift or retailer link opens it in your phone's **system browser**
  again, not the in-app browser. The in-app browser (added in a prior change)
  silently broke Shop Pay, Apple Pay / PayPal handoff, store logins and saved
  cards because it couldn't open popups and kept its own cookie store. If a link
  ever fails to open, you now get a "Copy link" option instead of nothing
  happening (DEV-149).
- On the home cards, the recipient's name and the occasion now sit on
  **separate lines** for easier reading (DEV-163).
- Home-screen vertical spacing was dialed in to better match the design
  (DEV-161).

### Backend (live on merge)

- **Occasion suggestions got more reliable and more relevant.** They now appear
  even for occasions that don't have a known date yet, and no longer quietly
  fall back to generic holidays when the tailored pipeline hiccups. They also
  draw on a richer recipient profile — cultural context and important dates
  captured during the add-a-person chat — plus a normalized relationship, so the
  recommended moments fit the person better (DEV-155, DEV-156, DEV-157, DEV-158,
  DEV-159, DEV-160).
- Gifting and generic holiday dates no longer leak into the synthesized
  recipient profile, so the profile reflects the actual person rather than
  calendar noise (DEV-152).
- Removed a leftover hardcoded gift-prompt fallback that could surface canned,
  off-target suggestions when the AI call failed (DEV-164).
- New sign-ups no longer fail with "Database error saving new user" — the
  account-creation trigger still referenced a database column that had been
  removed (PR #171).
