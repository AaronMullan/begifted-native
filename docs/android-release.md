# Android Release — Findings & Current State

Status as of 2026-07-23. Code work lives in PR #347 (`android-support`). The
full phased plan (build → UI fixes → FCM → Play Console → production) was
executed through the first two phases; the rest is blocked on external account
setup listed under "Outstanding".

## Current state

- The app **builds and runs on Android** (verified on a Medium Phone API 36.1
  emulator via `npx expo run:android`). Managed/CNG workflow: `android/` is
  generated and gitignored; `app.json` is the source of truth.
- Emulator smoke test passed: boot + splash, intro carousel, sign-up form with
  the password field visible above the keyboard, dark status-bar icons over the
  beige header, hardware back dismissing sheets, and `begifted://faq`
  deep-linking to the FAQ route with correct safe-area layout.
- Not yet smoke-tested (needs a signed-in session / FCM): conversation
  composer keyboard behavior, contacts import prompt, push end-to-end,
  notifications-screen blur, Sentry symbolication.

## What was Android-ready without changes

- Push client code: Expo push tokens (`getExpoPushTokenAsync`), dynamic
  `Platform.OS` stored with the token, and the `gift-suggestions` Android
  channel already created. The backend (`be-gifted`) sends via the Expo Push
  API, which is platform-agnostic — **no backend changes needed**.
- Auth: email/password only, PKCE on native, `begifted://auth/callback`
  redirect using the `scheme` from `app.json` (intent filter is generated).
  Confirm the redirect URL is in Supabase's allowlist when testing sign-up.
- All `Platform.OS` branches had Android fallbacks; fonts are loaded
  per-weight (no synthesized `fontWeight` on custom families); no shadow
  styles exist anywhere; no iOS-only native modules are in use.

## What PR #347 changes

| Area                              | Change                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.json`                        | `android.package: com.begifted.app`; pinned `softwareKeyboardLayoutMode: "resize"`; transparent Android splash image (see traps)                                    |
| `eas.json`                        | `android.autoIncrement` on preview/production profiles                                                                                                              |
| `ConversationView.tsx`            | Manual keyboard padding animation now iOS-only — Android's `adjustResize` already resizes the window, so the padding double-lifted the composer ~2× keyboard height |
| `use-keyboard-height.ts`          | Returns 0 on Android for the same reason (covers Portal dialogs)                                                                                                    |
| 10 `KeyboardAvoidingView` screens | `behavior` is `undefined` on Android instead of `"height"` (misbehaves under adjustResize/edge-to-edge)                                                             |
| `ContactPicker.tsx`               | `onRequestClose` so hardware back dismisses the modal                                                                                                               |
| `app/_layout.tsx`                 | Root `<StatusBar style="dark" />` — edge-to-edge leaves icon contrast to the OS otherwise                                                                           |
| `notifications.tsx`               | `experimentalBlurMethod="dimezisBlurView"` so BlurView actually blurs on Android                                                                                    |
| `use-push-notifications.ts`       | Dropped `sound: "default"` from the channel — the field takes a raw resource filename; omitting it selects the system default                                       |

**Keyboard rule going forward:** rely on Android `adjustResize`; all JS-side
keyboard compensation must be iOS-only. Never use `behavior="height"`.

## Repo traps learned (will bite again)

- **expo-splash-screen color-only config breaks the Android build.** The
  plugin writes a `windowSplashScreenAnimatedIcon` reference to
  `drawable/splashscreen_logo` even when no `image` is configured, then never
  generates the drawable → `resource ... not found` at
  `:app:processDebugResources`. Fix in place: a transparent
  `assets/images/splash-blank.png` as the Android splash image, keeping the
  native splash a plain `#7da4b0` like iOS.
- **`expo run:android` incremental prebuild does not re-run config plugins.**
  After changing plugin config in `app.json`, run
  `npx expo prebuild -p android --clean` or the change silently doesn't land.
- **Android notification channels are immutable once created** on a device;
  settings changes require an app reinstall (or a new channel id). No Android
  users exist yet, so the channel fix shipped without a migration.

## Known gaps

- **Adaptive-icon assets are Expo template placeholders** (blue chevron):
  `android-icon-foreground/background/monochrome.png` and the `#E6F4FE`
  background in `app.json`. Real brand art is required before any build goes
  to testers. (`splash-icon.png` is also unused template junk.)
- No Android submit config in `eas.json` yet — needs the Play service-account
  key (`submit.production.android.serviceAccountKeyPath` + `track`).
- Sentry Android sourcemap upload unverified until the first EAS Android
  build (`SENTRY_AUTH_TOKEN` must exist as an EAS env var).

## Outstanding — external setup (owner: Aaron)

1. **Google Play developer account** ($25 one-time). Critical path: new
   personal accounts must run a closed test with **12+ opted-in testers for 14
   consecutive days** before Google grants production access — recruit
   testers early.
2. **Firebase project** for FCM: add Android app `com.begifted.app`, commit
   `google-services.json` at repo root + `android.googleServicesFile` in
   `app.json`, and upload the FCM V1 service-account key via
   `eas credentials -p android`. Until then Android push tokens register but
   pushes don't deliver.
3. **Play Console app setup**: store listing (≥2 phone screenshots, 1024×500
   feature graphic, 512×512 icon), privacy policy URL, Data Safety form
   (contacts read, email, push tokens, Sentry crash data), content rating.
   SDK 57 targets API 36 — meets Play requirements.
4. **First AAB upload is manual** in the Play Console UI
   (`eas build -p android --profile production`); internal testing track
   first, then closed testing to start the 14-day clock. Afterwards, wire
   `eas submit` with a Play service account.
