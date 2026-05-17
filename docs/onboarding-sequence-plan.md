# Onboarding Sequence (7 slides) — Implementation Plan

## Context

The Figma file `vKruEWmOFcWGuYC8nHfsOU` ("BeGifted-pages_2") defines a 7-slide first-launch experience that does not yet exist in the app. Today, an unauthenticated user opens the app and lands directly on `components/Auth.tsx` (a plain email+password form rendered by `app/index.tsx`) with no marketing context, no name capture, and no introduction to the product.

The new design replaces that cold-start experience with:
- **Slides 1-3** — swipeable intro slides establishing the value prop ("Your people. Their moments. Just the right gift." / "Thoughtful beats expensive." / "BeGifted pays attention to the details, so you don't have to.")
- **Slide 4** — sign-up form (Name + Email + Password — password added per Figma deviation noted below)
- **Slides 5-7** — post-auth conversational "Tell us about yourself" identity capture (redesign of existing `app/onboarding/identity.tsx`'s single textarea into an AI chat thread)

Slide imagery sources were stylistic photo references in the Figma frames (downloaded crops in `docs/figma-onboarding/frame-1.png` … `frame-7.png` for reference).

**Outcome:** new users get a branded, friendly intro before being asked to commit; existing users land in the sign-in flow they expect.

## Scope — Two PRs

| PR | Slides | Auth boundary | Risk |
|----|--------|---------------|------|
| **PR 1** (this plan) | 1-4 (pre-auth intro + signup) | Replaces unauth landing | Medium — gates the entry point |
| **PR 2** (sketched only) | 5-7 (conversational identity) | Post-auth | Medium — needs an edge function or reuse of `recipient-conversation` |

This document fully specifies PR 1. PR 2 is sketched in the final section.

---

## PR 1 — Pre-auth Intro + Signup (Slides 1-4)

### Design decisions (confirmed)
- **Library**: custom Reanimated v3 + horizontal `FlatList`. No `react-native-onboarding-swiper`.
- **Slide 4 has Password field added** beneath EMAIL (not in Figma, but required for email+password auth via `supabase.auth.signUp`).
- **First-launch gating**: AsyncStorage flag `@begifted/intro_seen`. If unset and unauth'd → show intro. If set → straight to `<Auth />`. Flag is set when user reaches/submits slide 4 OR taps Skip on the last intro slide.
- **Name storage**: write to `profiles.full_name` immediately after `supabase.auth.signUp` succeeds (matches existing `Profile` type in `lib/api.ts:56-70`).
- **Existing post-auth onboarding** (`welcome → identity → confirmation → recipient`) stays intact and runs as today.

### Files to create

1. **`app/intro/_layout.tsx`** — Stack with `headerShown: false`, `animation: "none"`. Renders `<GradientBackground />` per the CLAUDE.md per-screen pattern (see `app/onboarding/_layout.tsx` for the canonical reference).

2. **`app/intro/index.tsx`** — Single screen hosting the swiper. Reads/writes the AsyncStorage flag. On final signup success, the existing `app/index.tsx` auth gate takes over and routes to `/onboarding/welcome`.

3. **`components/intro/IntroSwiper.tsx`** — Horizontal `FlatList` with `pagingEnabled`, `snapToInterval={width}`, `scrollEventThrottle={16}`. Uses Reanimated `useSharedValue` + `useAnimatedScrollHandler` to drive the pagination dots (pattern: `components/recipients/conversation/SuccessView.tsx:24-55`). Props: `slides`, `onComplete` (called when user presses "Sign me up!" successfully).

4. **`components/intro/IntroSlide.tsx`** — Generic slide layout: header (BrandMark + BEGIFTED wordmark), centered hero text, optional image slot, footer (SKIP / dots / NEXT). Variants distinguished by props (no image / collage / full-bleed image / form).

5. **`components/intro/IntroFooter.tsx`** — Dark-teal `Colors.brand.buttonTeal` footer bar with `SKIP` (left, hidden on last slide), dots (center, active dot uses brand orange), `NEXT` (right). Pressables use `MaterialIcons` for any iconography per CLAUDE.md.

6. **`components/intro/SignUpSlide.tsx`** — Slide 4 form. Three Paper `TextInput`s (Name, Email, Password — `mode="outlined"`, mirroring `app/onboarding/identity.tsx` styling), Paper `Button` ("SIGN ME UP!", `mode="contained"`, dark teal). Below the button: secondary `Text` link "Already have an account? Sign in" → calls `onDismissIntro` to mark flag and let `app/index.tsx` render `<Auth />`.

7. **`lib/intro-storage.ts`** — Two tiny helpers around `@react-native-async-storage/async-storage`: `hasSeenIntro()` and `markIntroSeen()`. Key: `@begifted/intro_seen`.

### Files to modify

1. **`app/index.tsx`** — Auth gate. New branch before showing `<Auth />`:
   ```
   if (!session) {
     const introSeen = await hasSeenIntro();
     if (!introSeen) return <Redirect href="/intro" />;
     return <Auth />;
   }
   ```
   Use a small `useEffect` + state pattern (no `useCallback`/`useMemo` per CLAUDE.md React Compiler rule).

2. **`lib/api.ts`** — Add `useUpdateProfileName(userId, name)` mutation (or reuse existing profile update if one exists; agent report flagged none for full_name at signup). Query key from `lib/query-keys.ts`.

3. **`package.json`** — Confirm `@react-native-async-storage/async-storage` is installed; add if missing (it ships with Expo SDK 54 typically).

### Slide content (verbatim from Figma)

| # | Type | Headline | Body / Fields | Footer |
|---|------|----------|---------------|--------|
| 1 | Intro | "Your people. Their moments. Just the right gift." | 2-image photo collage with yellow accent stripe | SKIP / ● ○ ○ / NEXT |
| 2 | Intro | "Thoughtful beats expensive." | 2-image photo collage | SKIP / ○ ● ○ / NEXT |
| 3 | Intro | "BeGifted pays attention to the details, so you don't have to." | Full-bleed landscape (camper/sunset) | — / ○ ○ ● / NEXT |
| 4 | Form | "Create an account." | NAME, EMAIL, PASSWORD inputs + "SIGN ME UP!" + sign-in link | — |

**Asset TODO**: extract slide images from Figma when the API rate limit clears (~3 days from 2026-05-17). Until then, use solid-color placeholders with the brand palette so layout work isn't blocked. The crops in `docs/figma-onboarding/frame-*.png` show the intended composition.

### Reused tokens / components

- `Colors.brand.buttonTeal` — primary CTA + footer bar
- `Colors.darks.black` — hero text
- `Typography.h1` (Poltawski Nowy SemiBold, 32/33) — hero headlines
- `Radii.lg` (18px) — input + button radius
- `<GradientBackground />` (`components/GradientBackground.tsx`) — per-screen
- `<BrandMark />`, `<BrandWordmark />` — slide header
- Paper `Button`, `TextInput`, `Text` — never raw RN equivalents (CLAUDE.md)
- Reanimated pattern from `components/recipients/conversation/SuccessView.tsx:24-55`
- TextInput styling pattern from `app/onboarding/identity.tsx` (rgba white background, outlineStyle with Radii.lg)

### Sign-up flow

```
SignUpSlide submit
  → supabase.auth.signUp({ email, password })
  → on success: profiles upsert { id: user.id, full_name: name }
  → markIntroSeen()
  → app/index.tsx auth gate observes session, routes to /onboarding/welcome
  → on error: Paper Snackbar (existing project pattern), keep user on slide 4
```

### Verification

1. **Cold-launch (new device)**
   - `npm start` → simulator → expect intro slide 1.
   - Swipe right → slide 2 → dots advance → slide 3 → tap NEXT → slide 4.
   - Fill Name + Email + Password → SIGN ME UP → confirm Supabase user is created (`supabase` dashboard or `mcp__supabase__execute_sql`: `select id, email from auth.users order by created_at desc limit 5`).
   - Confirm `profiles.full_name` is populated for the new user.
   - Confirm app lands on `/onboarding/welcome` (existing post-auth onboarding).

2. **Returning user (intro flag set, signed out)**
   - Manually set the AsyncStorage flag, sign out, relaunch → expect `<Auth />` (no intro).

3. **Sign-in link from slide 4**
   - On slide 4 → tap "Already have an account? Sign in" → expect `<Auth />` sign-in form.

4. **Skip behavior**
   - From slide 1 or 2, tap SKIP → expect jump to slide 4.

5. **Tab bleed-through regression check (CLAUDE.md GradientBackground rule)**
   - Verify `<GradientBackground />` is only inside `app/intro/index.tsx`, not at root.

6. **Lint + format**
   - `npm run lint && npm run format:check`

---

## PR 2 — Conversational Identity (Slides 5-7) — Sketch only

Out of scope for PR 1, but called out so PR 1 doesn't paint us into a corner:

- Replaces the textarea in `app/onboarding/identity.tsx` with a chat thread (EH user avatar / BeGifted assistant turns) — see `docs/figma-onboarding/frame-6.png` and `frame-7.png`.
- Likely reuses the `recipient-conversation` edge function pattern (existing in `supabase/functions/recipient-conversation/`) but applied to the giver's own profile. May warrant a new `user-identity-conversation` edge function or a `mode: "self" | "recipient"` param on the existing one — design decision deferred.
- Final assistant turn writes the synthesized profile to `user_preferences.user_description` (existing column) + triggers `synthesize-giver-profile` (existing edge function), then marks `onboarding_completed = true`.
- No changes needed to PR 1 to enable PR 2.

---

## Open items before implementation

- **Slide imagery**: blocked on Figma API rate-limit (~2026-05-20). Implement with placeholders, swap in real assets when API recovers.
- **Snackbar import path**: confirm the project's existing toast/snackbar pattern (Paper `Snackbar` or a custom wrapper) during implementation — small spike, no blocker.
