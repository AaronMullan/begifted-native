# Changelog

User-facing release notes for the BeGifted app. Each entry describes **what a
tester will actually notice**, not the technical change — enough that a
non-technical beta tester knows exactly what to check.

Entries are grouped by where they ship:

- **App** changes (React Native / JS) ride the next EAS build or OTA update
  (`eas update`) — they are **not** live on merge to `main`.
- **Backend** changes (edge functions, migrations) go **live on merge** to
  `main` via the auto-deploy workflows.

**Unreleased entries live in `changelog.d/`**, one file per ticket
(`DEV-<n>.<app|backend>.md`), so parallel PRs never conflict here — see
`changelog.d/README.md`. At release time, compile those fragments under a new
dated heading (e.g. `## 2026-06-15 — OTA`), delete them, and tag the release
commit. Started 2026-06-13; the prior **Build 45** release (2026-06-12) was
backfilled retroactively so testers have notes for what they're already
running. Earlier builds (≤ 44) are not backfilled here.

## 2026-07-14 — Build 54 (TestFlight)

### App

- Creating an account now requires checking "I agree to the Terms of Service and acknowledge the Privacy Policy" — both documents open from the signup screen, and your acceptance is recorded. (DEV-143)
- Settings has a new "Legal & Privacy" entry that opens Terms of Service, Privacy Policy, and the Apple App License in your browser. (DEV-144)
- Adding a person now shows a light reminder to only add information you have the right to provide. (DEV-146)
- The add-a-person screens note that BeGifted is for adults, and child-recipient details should only be added by a parent/guardian or someone with authority. (DEV-147)
- A short in-app explainer now appears before the system asks to allow notifications (with a "Not now" option), and the contacts-access explainer clarifies that only the people you pick get imported. (DEV-148)
- The avatar in the top-right header now shows your profile photo when you've added one (Settings → Account Info); initials remain the fallback. (DEV-169)
- Added quick beta check-in cards that appear once at three moments — after onboarding, after adding your first person, and after reviewing your first set of gift ideas — asking a couple of tap-to-answer questions about how it felt (DEV-191).
- Saving or deleting people, occasions, and profile changes now shows a brief message at the bottom of the screen when it fails (previously some failures were silent), including a clearer note when you're offline. (DEV-222)
- No visible change: added an automated test suite covering birthday parsing and occasion-date math (the logic behind calendar dates, reminders, and holiday scheduling), so regressions there get caught before release. (DEV-223)
- Under-the-hood platform upgrade (Expo SDK 57 / React Native 0.86) with refreshed crash-reporting and data libraries. Requires the new dev build; watch for anything that looks or behaves differently anywhere in the app and report it. (DEV-225)
- Cleanup pass across settings, FAQ, onboarding, and the chat screens: buttons, chips, and list rows now use the app's standard components, and saving notification settings shows the standard bottom-of-screen message on failure instead of a browser-style popup. No visual redesign — screens should look the same. (DEV-226)
- Internal cleanup only — nothing visible changes. Dead code and an unused dependency were removed, slightly shrinking the app (DEV-227).
- Admin-only screens now check access once at the door instead of on every screen. Non-admins who somehow land on any admin page see a single clean "Access Denied" message; admins see no difference (DEV-228).
- Internal restructuring of the admin Prompt Playground — no visible changes; the screen should look and behave exactly as before (DEV-229).
- Internal cleanup of how dates like "July 7" are formatted across Home, Moments, People, and person pages — every date should look exactly the same as before (DEV-231).
- No visible change: internal reorganization of the data layer and the recipient About screen to keep files smaller and easier to work on. (DEV-233)
- Contact detail screen internals reworked for reliability: deleting a contact now asks via an in-app styled dialog, the "Update what we know" and "Add Occasion" chats now always greet you by the contact's name (previously the chat could open blank), and stale data after profile updates should be rarer. (DEV-235)
- The "Report a Bug" button at the bottom of the home screen is gone — use the bug icon in the top-right header (or Settings → Report a Bug) instead. (DEV-248)
- Older screens (Settings, People details, FAQ, onboarding, gift lists) now use the new brand fonts — Poltawski Nowy headlines and DM Sans body text — instead of the system font, and all text sizes snap to the design-system type scale. The People-card status line also returns to a readable size (it was rendering at 8pt). (DEV-249)
- Adding an occasion from the calendar no longer traps you behind the keyboard — the Save and Cancel buttons stay visible while typing, and tapping anywhere outside the text field dismisses the keyboard. (DEV-250)
- Home screen matches the refreshed design: occasion cards now carry a "..." menu (view gift ideas / edit person), the Next Up card sits flush left with a wide preview of the next card, and section spacing is tighter (DEV-251)
- New users with nobody added yet now see a proper welcome screen on Home — "Welcome to BeGifted" with Import From Contacts / Add People Manually cards and a photo collage — instead of a bare "No upcoming occasions yet." (DEV-252)
- Settings is now a clean text list (Your Info, Your Gifting Style, Notifications, Billing & Subscription, FAQ, Contact Us, Sign Out) instead of the old cards; sub-screens follow the new names (DEV-253)
- Past Gift Recommendations moved from the bar pinned at the bottom of the gift ideas screen to an inline section after the gift cards — tap the teal band to expand past gifts in place; the "About" link under the title is now gold and product titles stay on one line (DEV-254)
- Home screen "Next up" cards now come in three colors (gold, maroon, light blue) assigned per occasion, instead of always alternating teal and gold. Each occasion keeps its color between visits. (DEV-255)
- Next Up cards on Home no longer show all in one color — neighboring cards always get different brand colors (DEV-256)
- Under-the-hood cleanup of how several screens track state (splash animation, toasts, gifting/notification/profile settings, the recipient add flow, occasion editors, and gift cards). No visible change is intended — watch for any odd re-seeding of form fields, flicker, or values resetting while you type, and report it. (DEV-257)
- Stopped a React Native internal warning from popping a full-screen red error box when tapping into fields on scrollable screens in dev/TestFlight builds. (DEV-258)
- The FAQ screen has a refreshed look matching the new design — a clean divided list with the brand serif heading; tap any question to expand its answer. (DEV-259)
- Settings is closer to the finalized design: the menu now reads "Account Info" and "Gifting Style", Sign Out asks you to confirm first, the Billing screen shows your plan and pricing, and Contact Us has a real message form. (DEV-259)
- Settings pages now match the finalized v4 design: Notifications is three toggles (Push, Gift & Occasion Reminders with a 1/2/3 "How Many Reminders?" picker, Product Updates) that save instantly; Billing shows the "Coming Soon" BeGifted Plus billboard; Contact Us gets the new field styling with a centered teal Send button; the Settings menu row is renamed "About You" and the separate Report a Bug row is gone — use Contact Us instead. (DEV-259)
- You can now delete your account from Account Info — a confirmation dialog explains what gets removed before anything is deleted, and confirming permanently erases your account and all your saved data (DEV-260).
- Account Info edits (name, city, state) now save automatically as you go — no Save button — and you can change your password from a new Security section. (DEV-261)
- Contact Us now really sends: your message goes straight to the BeGifted support inbox and the screen confirms "Message sent" — no more "coming soon" notice. Replies arrive by email. (DEV-263)
- You can now add a profile photo in Account Info — tap the photo circle to pick one from your library (DEV-266).
- Confirmation messages ("Occasion added", profile updated, etc.) now look and behave the same on every screen — they appear as the standard bottom snackbar instead of a different centered popup on the Moments and People screens. (DEV-267)
- Past gift recommendations now show inline under each person instead of hiding behind a tap-to-expand drawer (DEV-269).
- The bottom-nav People and Moments icons now match the design (a grouped-people glyph and an outlined calendar) (DEV-271).
- The bottom-nav icons are now vertically centered in the bar. They were floating near the top because the space reserved at the bottom for the iPhone home-indicator was left empty below them; the icons now center in the full bar while still clearing the home indicator (DEV-271).
- Admin Playground: the new GPT-5.6 models (Sol, Terra, Luna) are now selectable under the OpenAI provider. (DEV-272)
- Account Info now has a Birthday field and the State field is a proper dropdown of US states (full names in the list, abbreviation once picked) instead of free text. (DEV-274)
- The Gifting Style page is now "About You": a card shows what BeGifted has learned about you as a person, and a "Continue the conversation" drawer lets you chat naturally about your interests, tastes, routines, or retailers to avoid — replacing the old free-text box. What you share immediately updates the profile that gift recommendations use. (DEV-275)
- Refreshed two palette colors: the light teal accent (settings pickers, calendar highlights) is now a cooler blue-gray, and cream card backgrounds (calendar cards, recipient dialogs) are now a lighter warm off-white. (DEV-277)
- Tapping the verify-account link in the signup email now brings you back into the app, already signed in — instead of stranding you on the BeGifted website in Safari (DEV-279).
- New users are no longer stuck on intro-style screens after verifying their email — verification now lands in the app and continues into onboarding (DEV-280).
- A recipient's birthday now always lands on its next real date — previously it could be saved a year too far out and never show up as the next occasion on the home screen (DEV-281)
- Occasions can now be renamed: open a person's profile, tap the occasion's menu → Edit, and change the name alongside the date (DEV-283)
- Editing an occasion from a person's profile now opens with its current name and date filled in, and saving a rename works — previously the fields came up blank and saving failed with "Couldn't save the occasion" (DEV-283).
- When adding a person, you can now track any occasion you like — tap "Add your own" on the occasion-selection step to name and date a custom occasion beyond the suggested ones (DEV-284)
- Dates are now entered the familiar US way — month, day, year (e.g. 12-25-2026 or 8/18/1978) — in birthday fields and the occasion date editor, instead of year-first ISO format (DEV-285)
- Occasions no longer get a fake January 1 date when the real date isn't known — known holidays now resolve to their true date automatically, and anything else shows as "No date set" on the profile until you add one. Telling the chat someone's age also no longer creates a phantom January 1 birthday; the age is still remembered for gift suggestions. (DEV-286)
- The People tab has a refreshed look: one "Add More People" button opens a chooser with Import From Contacts / Add People Manually (the same chooser now appears from the Home button), people rows are larger with the next moment shown as "Birthday: Mar 14", and the "..." menu is now just Modify Details and Remove Person. (DEV-287)

### Backend

- Signup confirmation emails now arrive reliably, come from noreply@bgftd.com with BeGifted branding, and are no longer capped at 2 per hour (DEV-75).
- Internal restructuring of the recipient-chat backend — no visible changes; adding a person via chat should behave exactly as before (DEV-230).
- Locked down two database read policies: profile rows (which include addresses) and the AI prompt library are no longer readable by anyone with the app's public API key — each user can now only read their own profile. Testers shouldn't notice anything; all screens keep working (DEV-232).
- No visible change: stronger type checking on the AI profile-synthesis and preferences-extraction functions and the web contact import, guarding against a class of silent data bugs. (DEV-234)
- Gift-ready notifications now show up in the app's notification list even if you haven't enabled push notifications on a device (DEV-240).
- Gift suggestions now come with a product photo far more often — previously about 1 in 4 cards had no image because big retailers (Chewy, Macy's, Walmart, …) block our image lookup; new suggestions now recover those photos from a search index (DEV-270).
- The Notifications settings now change what you actually receive: turning off "Gift & Occasion Reminders" stops occasion pushes entirely, and "How Many Reminders?" sends that many nudges spread across the weeks before each occasion (e.g. 3 → about 21, 14, and 7 days out). (DEV-276)
- Gift ideas now reference the recipient's next upcoming occasion — previously a just-passed occasion (e.g. a June birthday) could keep driving suggestions and their "why this fits" copy instead of the next real event (DEV-282)

## 2026-07-07 — Build 53 (TestFlight)

### App

- Text across the app is noticeably bigger and easier to read — the design team's new type scale. Card titles (gift ideas, people names, calendar cards) went from small to prominent, buttons and links like "View Product" and "View Gift Ideas" are larger, and section labels like NEXT UP grew a touch. The Home screen also changed shape: the "Next Up" row now shows one big card at a time (swipe to snap between them, with a sliver of the next card visible on each side), the featured card at the top is a bit taller, and gift descriptions ("Why This Fits") are much easier to read (DEV-243).
- Occasion titles no longer double up the person's name. An occasion whose type accidentally had the name baked in (e.g. it showed as "Lizzy's Lizzy Birthday" on Home and Moments) now reads cleanly as "Lizzy's Birthday" (DEV-213).
- Your events no longer lose their names when you open the app. On a shaky connection the Home and Moments screens could show your occasions with the person's name replaced by "Someone"/"Unknown" (and a "?" photo); the app now keeps the real names on screen and quietly retries in the background instead of showing a name-less version (DEV-212).
- Tapping a notification now takes you straight to the latest gift ideas for that person. Previously a "new gift" alert could drop you on the older, cached list, so you had to back out and go in again before the fresh suggestions appeared. Now the tap refreshes the list on arrival — for any alert, not just new-gift ones (DEV-208).
- Some gift cards that were missing their product photo now show it. Photos hosted on insecure `http://` links were being blocked by iOS and silently hidden; the app now loads them over a secure connection instead, so those images appear (DEV-214).
- Product links now open consistently: tapping "View Product" always opens the link in your phone's system browser, and if you have the retailer's own app installed (e.g. Amazon) iOS may hand off to that app — that handoff is expected, not a glitch. A leftover in-app-browser code path was removed so nothing can pop a product page open inside BeGifted itself (DEV-210).
- When someone's occasion is actually today, the Home hero card no longer says it "is coming up" while the date reads "Today." It now says "Today is {Occasion} for {Name}." (e.g. "Today is Father's Day for Michael.") — future occasions still show the upcoming wording (DEV-207).
- Adding a person via "Add from contacts" no longer crashes to the "Something went wrong" screen when the picked contact has a state/region saved in their address. That person now imports normally with their address prefilled (DEV-206).
- The Moments calendar now keeps a day's occasion marker after the date has passed. Previously a birthday or anniversary dot disappeared the day after the occasion; now the dot (and the person card when you tap that day) stays put, so a past occasion is still shown on its day. Recurring birthdays and anniversaries also now show their marker on the upcoming date each year, not just the originally saved one (DEV-209).
- Adding an occasion to a specific day on the Moments calendar now stays on that day. Tap a date, choose "Add to this day," and pick a person — instead of jumping to that person's profile (and losing the date you picked), a small form opens already set to the chosen day. You just name the occasion (with quick picks like Birthday or Anniversary) and choose whether it repeats yearly, and it's saved onto that date (DEV-205).
- Text holds together better when you turn iOS system text size all the way up (Settings → Accessibility → Display & Text Size → Larger Text). Headlines, buttons, section labels, the bottom-nav labels, and the Moments year-grid day numbers previously got clipped inside their line at very large sizes; they now grow to fit. Everything looks the same at the default text size (DEV-203).
- Tapping a "new gift suggestions" notification no longer lands you on an empty gifts screen. If you'd previously opened a person filtered to one occasion, a later notification could leave that stale filter in place and show "No gift suggestions" even though the gifts existed under a different occasion; opening a person now always shows their gifts unless the notification points at a specific occasion (DEV-220).
- On a person's Gift Ideas screen, "Past Gift Recommendations" is now a bar pinned just above the bottom nav instead of sitting at the end of the scroll. It stays put while you scroll the newer gifts, and tapping it slides the older recommendations up over the screen (tap again to close). Look for it on any person who has more than three gift ideas (DEV-216).
- The onboarding "Add your first person" step now spells out that you can add yourself, not just other people — the prompt reads "It can be anyone you care about — including yourself." Nothing about the flow changed; adding yourself already worked, it's just a visible option now (DEV-217).
- On the Moments calendar, "Add to this day" no longer offers people who already have an occasion on that date. If Michelle is already on June 26, she won't appear in the picker for June 26 — she still shows up for every other day, and if everyone you know is already on that day the picker says so and offers "Add a new person" instead (DEV-247).

### Backend (live on merge)

- All remaining AI backend endpoints now require you to be signed in. Testers shouldn't notice anything — the app already proves who you are on every call — but anonymous callers on the internet can no longer run our AI features on our dime or overwrite profile data by guessing IDs. Nothing to test beyond the usual flows (add a person, chat, gift ideas, settings) working as before (DEV-221).
- The gift-generation backend now requires you to be signed in (and only lets you act on your own people). Testers shouldn't notice anything day-to-day — gift refills after removing a suggestion and the admin prompt playground keep working once the app update lands, but anonymous callers on the internet can no longer trigger gift generation, read profiles, or overwrite people's data. Until this app update is installed, removing a gift won't auto-refill the list (it self-heals with the next daily generation) (DEV-236).
- New "gift suggestions ready" notifications triggered on demand (right after you add an occasion) now deep-link to that specific occasion's gifts, matching the scheduled daily notifications — so the tap lands on the right list instead of the person's default view (DEV-220).
- Server errors (e.g. during gift generation or the recipient chat) no longer send raw technical details to the app — the app now gets a plain "Internal server error" plus a reference code we can look up in the server logs. Testers shouldn't notice any day-to-day difference; error moments look the same, they're just no longer leaking internals (DEV-224).

## 2026-06-21 — Build 52 (TestFlight)

### App

- The small icon buttons that were fiddly to tap now have a larger touch area meeting Apple's recommended minimum, so they're easier to hit accurately: the bug-report icon and avatar in the top header, the back arrows on the Settings sub-screens (Support, Gifting, Notifications, Profile, Billing) and FAQ, the back/close buttons in the Add-a-person conversation and recipient detail dialogs, the "…" options buttons on Moments, gift, and occasion cards, and the expand/collapse chevron on gift cards. The icons look exactly the same — only the tappable region grew (DEV-204).
- VoiceOver now reads the −/+ lead-day buttons in Settings → Notifications (the control that sets how many days ahead you get gift ideas). It announces them as "Decrease lead days" / "Increase lead days" buttons instead of staying silent, and the checkmark on the currently selected timezone now reads as "Selected" — so the screen is usable with a screen reader (DEV-202).
- The gift feedback sheet (the options that slide up when you tap a gift idea) now matches the agreed design: six tappable options instead of eight. "Remove this idea" and the separate "Gift feedback >" note row are gone. Tapping an option records it right away — nothing extra is required. Most options then offer an optional note you can fill in or Skip ("I chose this gift", "They already have this", "Not for them", "Product problem"), "Price feels off" adds quick-pick chips (Too expensive / Too cheap / Not worth the price / Budget changed) plus an optional note, and "Keep this in the mix" needs no follow-up. Removing a gift via "Not for them" / "Price feels off" / "They already have this" / "Product problem" still refreshes your list with a new idea as before. The feedback rows are also larger and easier to tap (DEV-196, DEV-195).
- From the Moments calendar, the "Add to this day" / "Add Moments" picker now has an "Add a new person" option, so you can create someone who isn't in BeGifted yet right from the calendar — no more bailing out to the People tab first. (Previously the picker only listed existing recipients, and the empty state was a dead-end telling you to add a recipient elsewhere.) (DEV-200).
- A very long gift title on an opened gift card no longer runs into the expand chevron in the top-right corner. Long titles now wrap and trim cleanly within the card instead of colliding with the arrow (DEV-201).
- More gift ideas now show their product photo. Previously a card could come back image-less even when a photo was available — a too-strict size check and a separate, flaky image probe were quietly dropping valid photos (e.g. ones a retailer served slowly or that were a touch under the old size cutoff). Cards still stay the same height while a photo loads and cleanly show no image when there genuinely isn't one. Behind the scenes we now record why each card did or didn't show a photo, so we can tell "the gift had no photo" apart from "the photo failed to load" and catch any future drop quickly (DEV-186).

### Backend (live on merge)

- Finishing the "add an occasion" chat no longer dead-ends with an "Error" alert
  when the occasion can't be auto-detected. If the behind-the-scenes step that
  reads the occasion type and date hiccups, the occasion now still saves (as a
  generic occasion with a placeholder date you can adjust) instead of failing
  silently and losing what you typed (DEV-198).
- Finishing an "add an occasion" chat now actually saves the occasion. The
  assistant would confirm the occasion and show the save button, but the final
  save silently failed every time and the occasion was dropped. It now goes
  through and the new moment appears on the recipient and in your calendar
  (DEV-194).

## 2026-06-19 — Build 51 (TestFlight)

### App

- The gift-options drawer (the sheet that slides up when you tap a gift idea's options) now matches the finalized design: the feedback options are a clean text list with "Keep this in the mix" emphasized at the top (the placeholder dot in front of each option is gone), the rows sit on a tighter line spacing, and the "Send" control on the "Gift feedback" note screen is now a gold outlined up-arrow instead of a solid paper-plane button (DEV-190).
- On a recipient's gift ideas screen, the expand chevrons inside the "Past Gift Recommendations" section are now dark teal instead of gold, so past suggestions read as visually distinct from the current gold-chevron recommendations above them (DEV-189).
- The Moments calendar now has a year view. Tap the gold chevron next to the month name to zoom out to all 12 months at once, each as a tiny calendar showing where your moments fall across the year (with the same per-person colored dots). Tap any month to drop straight into it, or tap the gold chevron next to the year to collapse back (DEV-193).
- The Moments tab is now an actual calendar instead of a long list. It opens on the current month with a Monday-first grid: today is circled in gold, and any day with a moment shows a small colored marker beneath it (each person keeps the same color, so you can tell at a glance whose occasion it is — one bar for a single moment, a row of dots for several). Tap a day to open it: the screen shows that date with a card for each person who has a moment then (tap their card to jump to gift ideas), plus an "Add to this day" button. Use the ‹ › arrows to move between months, or tap the gold chevron next to the month name to zoom out to the year (DEV-192).
- On the Home screen, the "NEXT UP" and "ON THE HORIZON" section labels now sit tighter to their cards and the row above them (the extra empty space is gone), are nudged in slightly, and the date line on the cards (e.g. "Tomorrow • June 19") now uses a rounder bullet separator (DEV-188).
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
  </content>
  </invoke>
