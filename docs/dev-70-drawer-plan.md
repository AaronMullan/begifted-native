# DEV-70: Bottom-up Gift Action Drawer — Implementation Plan

Ticket: [DEV-70](https://linear-or-jira-link) — _Implement bottom-up drawer as tactical action layer_

## Context

The 3-dot / circle action control on gift cards currently does nothing
(`components/gifts/GiftCardActionButton.tsx:16-20` is a TODO stub). DEV-70 wires
that control to a reusable bottom-up drawer with 8 actions. Most of the backend
already exists from DEV-48:

- `gift_feedback` table + RLS + 7 action enums (`20260510_create_gift_feedback.sql`)
- `lib/api.ts` `insertGiftFeedback`, `GiftFeedbackAction`, `InsertGiftFeedbackInput`
- `hooks/use-submit-gift-feedback.ts`
- Rejection → `recipients.avoid_list` trigger (`20260510_gift_feedback_avoid_list_trigger.sql`)

What DEV-48 deliberately deferred to "PR-C": writing `occasions.fulfilled_at`
when a user picks "I chose this gift". DEV-70 owns that piece.

## Confirmed decisions

| #   | Decision                                      | Choice                                                               |
| --- | --------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Bottom-sheet library                          | `@gorhom/bottom-sheet`                                               |
| 2   | `OccasionOverflowButton` (3-dot on occasions) | Out of scope — leave stubbed                                         |
| 3   | "Gift feedback / intelligence" action         | Free-form notes screen, writes existing `keep_in_mix` enum + `notes` |
| 4   | `chose` → `fulfilled_at`                      | DB trigger, in this PR                                               |

## Tasks

### 1. Dependencies

- [ ] Verify `react-native-reanimated` + `react-native-gesture-handler` present (they ship with Expo SDK 54 baseline; confirm in `package.json`)
- [ ] Install `@gorhom/bottom-sheet`
- [ ] Ensure `GestureHandlerRootView` wraps the app at the root (Expo Router usually does; verify in `app/_layout.tsx`)

### 2. Drawer component

`components/gifts/GiftActionDrawer.tsx`

- Single bottom-sheet instance, opened/closed via context (see task 3)
- Snap points: dynamic content height
- Two views inside the sheet:
  - **Root list** — 8 rows. First 7 map to enums; the 8th opens the notes view.
  - **Notes view** — multiline Paper `TextInput`, Send/Cancel
- Visuals: Paper `Text` variants, `MaterialIcons`, palette from `lib/colors.ts`
- Each row's `onPress`:
  1. Call `useSubmitGiftFeedback().mutate({ recipientId, giftSuggestionId, occasionId, action, notes? })`
  2. Close drawer on success (optimistic)
  3. Surface error via `Snackbar` if mutation fails

Row → enum map:

| Label                  | Action                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Keep this in the mix   | `keep_in_mix`                                                   |
| I chose this gift      | `chose`                                                         |
| They already have this | `already_have`                                                  |
| Not for them           | `not_for_them`                                                  |
| Price feels off        | `price_off`                                                     |
| Product problem        | `product_problem`                                               |
| Remove this idea       | `remove`                                                        |
| Gift feedback          | `keep_in_mix` + `notes` (neutral — avoid_list trigger skips it) |

### 3. Drawer provider (singleton mount)

`components/gifts/GiftActionDrawerProvider.tsx`

- React context exposing `openDrawer(suggestion, occasionId)` and `closeDrawer()`
- Renders one `<GiftActionDrawer>` instance inside the provider tree
- Wrap `app/_layout.tsx` with the provider so any tab/screen can call `openDrawer`

Why singleton: avoids mounting one sheet per card and lets us reuse the same
sheet from the home screen and `/gifts/[id]`.

### 4. Wire the action button

`components/gifts/GiftCardActionButton.tsx`

- Add `occasionId?: string | null` prop
- Replace TODO at line 16 with `useGiftActionDrawer().openDrawer(suggestion, occasionId)`

Thread `occasionId` through:

- `components/gifts/PrimaryGiftCard.tsx:42` — pass occasionId from caller
- `components/gifts/CollapsedGiftCard.tsx:27` — pass occasionId from caller

Caller audit (find every place that mounts a card):

- [ ] Home screen surfaces (search `<PrimaryGiftCard` / `<CollapsedGiftCard`)
- [ ] `/gifts/[id]` (Gift Ideas page)
- [ ] Any other call sites

### 5. `chose` → `fulfilled_at` migration

`supabase/migrations/20260511_chose_fulfilled_at_trigger.sql`

```sql
CREATE OR REPLACE FUNCTION mark_occasion_fulfilled_on_chose()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.action <> 'chose' OR NEW.occasion_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE occasions
  SET fulfilled_at = now()
  WHERE id = NEW.occasion_id
    AND fulfilled_at IS NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER mark_occasion_fulfilled_on_chose_trigger
AFTER INSERT ON gift_feedback
FOR EACH ROW
EXECUTE FUNCTION mark_occasion_fulfilled_on_chose();
```

Notification suppression works automatically: the cron in the sibling
`be-gifted` repo already skips occasions where `fulfilled_at IS NOT NULL`
(`app/api/cron/generate-gifts/route.ts:287`).

### 6. Verification

- [ ] Type-check (`tsc --noEmit` or whatever the repo uses)
- [ ] Lint + format (`npm run lint`, `npm run format`)
- [ ] Manually test on iOS sim:
  - [ ] Drawer opens from home gift card
  - [ ] Drawer opens from Gift Ideas page card
  - [ ] Each row inserts a `gift_feedback` row (check Supabase)
  - [ ] "I chose this gift" sets `occasions.fulfilled_at`
  - [ ] Rejection actions append to `recipients.avoid_list` (DEV-48 trigger)
  - [ ] Notes view submits with text and clears
- [ ] PR opened against a feature branch (never main)

## Open questions

- **Design parity.** No Figma linked on the ticket. Default: style off existing
  card patterns + skim `BeGifted_mobile design refinements_050126.pdf`. Replace
  if a real mock surfaces.
- **Reorder / hierarchy.** Ticket lists actions in a specific order; "I chose
  this gift" is row 2 — leaving that order intact. Confirm if you want positive
  ("chose" / "keep in mix") visually grouped.
- **Confirmation step.** "Remove this idea" and "I chose this gift" are
  destructive-ish. Default: no confirm dialog, single tap. Flag if you want a
  Paper `Dialog` confirm.

## Out of scope

- `OccasionOverflowButton` (3-dot on occasion carousel) — separate ticket
- Editing or revoking prior feedback (DEV-48 is append-only; matches that)
- Backfill: existing data unaffected
