# DEV-84: Redesign People tab — Implementation Plan

Ticket: [DEV-84](https://be-gifted.atlassian.net/browse/DEV-84) — _Redesign People tab to match design refinements p.14_

## Context

Restyle `/contacts` (the "People" tab) to match `BeGifted_mobile design
refinements_050126.pdf` p.14. The current screen lives in
`app/(tabs)/contacts/index.tsx` and uses:

- Headline "My Contacts" + plain subtitle
- Stacked contained "Add Recipient" button + outlined "Import from Device
  Contacts" button
- A search input
- Dark-translucent `MenuCard`-based recipient rows (via
  `components/RecipientCard.tsx`)

The redesign reframes the screen around the user's people: warmer
headline, two side-by-side outlined CTA tiles, light recipient rows,
and a footer "Tell us how your recent moments went" link (matching the
home-screen stub).

## Confirmed decisions

| #   | Decision                          | Choice                                                                                            |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | Recipient row implementation      | New sibling component `components/contacts/PeopleRecipientCard.tsx` — `MenuCard` is dark/themed for the rest of the app; not worth polluting it with a light variant for one screen |
| 2   | Name rendering                    | Full `recipient.name` (not `formatShortName`) — design shows "Tiffany Renee Darwish" in full      |
| 3   | Search input                      | Drop. Re-introduce later if the recipient list grows past ~20                                     |
| 4   | "Tell us how your recent moments went" link | Reuse `RecentMomentsLink` from `components/home/` — extract into `components/shared/` if it grows a second consumer with diverging behavior |
| 5   | Status text on the right ("Address added") | Drop for now — re-spec later. Card renders only the overflow `...` on the right |
| 6   | Overflow `...` menu contents               | Edit (→ `/contacts/[id]?tab=details`), View gift ideas (→ `/contacts/[id]?tab=gifts`), Delete (Paper `Dialog` confirm + `useDeleteRecipient`) |
| 7   | "Import From Contacts" tile icon           | `people-alt`                                                                                                              |

## Tasks

### 1. New components

`components/contacts/PeopleCtaTiles.tsx`
- Two outlined tiles side by side: "Import From Contacts" + "Add People Manually"
- Style mirrors `components/home/AddPeopleTile.tsx` (outlined,
  `Colors.blues.dark` border + label) but rendered in a `flex: 1` row
  so the tiles split the available width
- Tile 1 `onPress` → opens the contacts-access intro
  (`ContactsAccessIntro`) / file picker flow already wired in
  `app/(tabs)/contacts/index.tsx:175-193`
- Tile 2 `onPress` → `router.push("/contacts/add")`

`components/contacts/PeopleRecipientCard.tsx`
- White background, `borderRadius: 18` to match the rest of the app
- 48px round avatar on the left:
  - If `recipient.photo_url` present: `<Image>` with `borderRadius: 24`
  - Else: muted-teal circle with white initials (first letter of first
    name + first letter of last name); reuse `Colors.blues.medium` /
    `Colors.neutrals.dark` for fill
- Middle column:
  - Full `recipient.name` (Paper `Text` bold)
  - Birthday line "Birthday: Jun 7 " followed by a small chevron right
    (`MaterialIcons name="chevron-right" size={14}`)
- Right column:
  - `...` overflow icon (`MaterialIcons name="more-horiz"`) — opens a
    Paper `Menu` with: Edit / View gift ideas / Delete (Delete opens a
    Paper `Dialog` confirm before calling `useDeleteRecipient`)
- Tap on the body (anywhere except `...`) navigates to
  `/contacts/${recipient.id}?tab=gifts`

`components/contacts/PeopleRecipientCardOverflow.tsx`
(small wrapper that holds the Paper `Menu` state — keeps the card pure)

### 2. Rewrite the screen

`app/(tabs)/contacts/index.tsx`

- Replace the header block (`<View style={styles.header}>`) with:
  - Fraunces serif headline split into two Text nodes so "your" can be
    italicized: `These are <Text italic>your</Text> people.`
  - Subtitle "Add the people who matter. We'll keep track of the
    moments that matter."
- Replace the stacked buttons + search with `<PeopleCtaTiles />`
- Replace the recipient list (`recipients.map(... <RecipientCard ...>)`) with
  `recipients.map(... <PeopleRecipientCard ...>)`
- Drop the search input and the `searchQuery` state + filter pipeline
- Add `<RecentMomentsLink />` below the recipient list (above the
  bottom-nav spacer)
- Keep the existing `ContactsAccessIntro` + `ContactPicker` modals
  mounted — only their trigger UI changes

`RecipientCard` stays untouched; other surfaces still use it.

### 3. Color / typography touch-ups

- Title color: `Colors.blues.dark` (per design — dark teal)
- Subtitle color: `Colors.darks.black` at 0.7-0.8 opacity
- Recipient card name: `Colors.blues.dark`, weight 700
- Birthday line: `Colors.blues.medium` (teal-gray)
- Overflow `...`: `Colors.blues.medium`
- Background of the screen: unchanged (the page gradient renders behind)

### 4. Verification

- [ ] Type-check (`npx tsc --noEmit`)
- [ ] Lint (`npm run lint`) — no new errors in changed files
- [ ] Format (`npm run format:check`) — no new format violations in
      changed files
- [ ] Manual sim test:
  - [ ] People tab matches PDF p.14 visually
  - [ ] Tapping "Import From Contacts" launches the access intro / file
        picker
  - [ ] Tapping "Add People Manually" routes to `/contacts/add`
  - [ ] Tapping a recipient row routes to
        `/contacts/[id]?tab=gifts`
  - [ ] Overflow `...` opens menu; Edit routes to
        `/contacts/[id]?tab=details`, View gift ideas routes to
        `/contacts/[id]?tab=gifts`, Delete shows a Paper `Dialog`
        confirm and removes the recipient on confirm
  - [ ] Initials fallback renders for recipients without a photo
- [ ] PR opened against a feature branch (never main)

## Out of scope

- Search re-introduction
- Overflow menu beyond Edit / Delete / View gift ideas (e.g. archive,
  share) — separate ticket if needed
- Gift-feedback CTA wiring (the "Tell us how your recent moments went"
  link is rendered through `RecentMomentsLink`, whose visibility flag
  flips on with DEV-48 follow-up work)
- Migrating other surfaces (home tile, recipient detail) off
  `RecipientCard` — only the People tab uses the light treatment per
  this design page
