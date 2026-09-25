# State families

Every waiting, empty and error state in the app belongs to one family. Copy
comes from `StateCopy` (`lib/state-copy.ts`); on-screen states render through
`components/StateMessage.tsx`, and transient ones (snackbars) take their text
from `StateCopy`. The wording is product-owned — change it in `StateCopy`, never
per screen.

Rules that hold across every family:

- A failed load can't look empty. Test the raw query value
  (`data === undefined && isError`), not a `?? []` default.
- A failed save can't report success.
- Generating, not due yet, no-results and failed stay distinct.
- Keep what the user typed when a save fails.
- Safety stops and crashes are separate, and so are "switched off" and "not
  built yet".

## Families and where they appear

**In progress** — `StateCopy.inProgress(thing)`, `StateMessage loading`.
Home, People, Moments (month and day), Notifications, recipient profile and its
moments, Gift Ideas (first load, generating, a new run over existing ideas),
About-tab profile refresh, the FAQ, and each Settings screen (index, profile,
gifting, notifications, billing, support, legal). Button spinners (Save,
Delete, Continue) stay as Paper `loading` props — no copy.

**Empty** — `StateCopy.empty(things)`.
Home upcoming moments, People list, a Moments day, the Notifications inbox, a
recipient's moments, Gift Ideas with nothing pending, and the FAQ.

**Deferred / not due yet** — `StateCopy.giftIdeasNotDue(name, occasion)`. Gift
Ideas only.

**True no-results** — `StateCopy.giftIdeasNoResults(name)`. Gift Ideas only.

**Recoverable failure (load)** — `StateCopy.loadFailed(thing)` +
`StateMessage onRetry`.
Launch routing (the onboarding check), Home people and upcoming moments, People
list and card moments, Moments, Notifications inbox, recipient profile and its
moments, Gift Ideas, the FAQ, and Settings → Profile / Gifting / Notifications.

**Recoverable failure (save)** — `StateCopy.saveFailed(thing)`.
Every `makeMutationHandlers` hook (moment save/add/birthday move, profile,
recipient), the recipient update note, the About-tab photo and birthday,
the gift action drawer, Settings → Gifting / Notifications / Profile photo and
password, and the reset-password form.

**Offline** — `StateCopy.offline`. Today it prefixes the save-failure message
when a mutation fails with a network error. Connectivity detection and a
standing offline banner are separate work (they need a native module).

**Permission required** — `StateCopy.permission(permission, benefit)`.
Photo access (recipient photo, profile photo) and push notifications
(Settings → Notifications).

**User-disabled / switched off** — `StateCopy.disabled(feature)`.
Signups closed by config (sign-in and intro sign-up), the notifications feed
when `app_config.notifications_enabled` is false.

**Feature unavailable** — `StateCopy.unavailable(feature)`. BeGifted Plus on
Settings → Billing.

**Safety stop** — outside `StateCopy`. The intake refusal ("Can't continue")
keeps its own wording.

**Fatal** — `StateCopy.fatal`. The root error boundary and the intro sign-up's
fallback error.

## Not mapped — waiting on a product decision

These were left as they are rather than invented around:

- **Deletes and sends.** "Couldn't delete the occasion / this person / your
  account" and "Couldn't send your message" (Support, beta check-in) aren't
  saves; the save spine would say the wrong thing.
- **Designed invitations that sit in the empty slot.** Home's "Welcome to
  BeGifted", "We're still getting to know you…" (Settings → Gifting and the
  About tab), and the secondary lines under empties ("Add one to remember what
  mattered on this day.") are kept; the spine replaced only the headline.
- **One-line status slots too small for a spine.** The People card's "No
  upcoming moments yet" and the "Finding a new idea" pending gift card.
- **The add-a-person chat's "Thinking..."** — a turn in a conversation, not a
  thing being got ready.
- **"Recipient not found"** — a person that no longer exists isn't empty,
  failed or unavailable.
- **Contacts import failure** can't tell a denied permission from a failed
  read, so it can't pick between the permission and load-failure families.
- **Auth errors** show Supabase's own message text ("Error: …"); a spine would
  drop the reason (wrong password, account exists).
- **Validation hints** (date formats, password length) aren't states.
- **`disabled` vs `unavailable`.** "Off for now. Check back later." fits a
  switch BeGifted flipped (signups, the notifications feed) better than one the
  user flipped; a user's own "off" (push turned off in iOS) is handled as a
  permission instead.

## Known gaps where the app doesn't know its state

- Progress that never resolves (DEV-512): a generation that stalls past the
  five-minute poll still reads as generating; the pending "Finding a new idea"
  card spins forever if the backfill request fails; a failed or timed-out
  profile refresh just stops showing progress.
- Saves that still report success when the write failed: onboarding
  identity/completion (DEV-509); "profile is ready" after a failed occasion or
  photo save, "Photo updated" after a failed database write, the Preferences
  and Information dialogs, and Settings → Profile's "Saved" on a zero-row
  update (DEV-510).
- The intake safety refusal falls through to Manual Entry, and the update note
  reads a refusal as "nothing new" (DEV-511).
