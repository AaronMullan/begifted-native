# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BeGifted is a gift-planning mobile app built with Expo SDK 54, React Native 0.81, React 19, and TypeScript. It uses Supabase for auth/database, TanStack Query for server state, React Native Paper for UI, and Expo Router for file-based navigation.

## Working Style

Start with the narrowest fix that solves the reported issue. Before expanding scope or proposing architecture changes, ask: "Is a smaller targeted fix sufficient?" When debugging, if a diagnosis isn't panning out, step back and re-verify from the top rather than digging deeper into a wrong root cause.

## Communication & Honesty

Do not claim a tool failed or assert how a tool, test, or remote system behaves unless you have verified it. State uncertainty instead, and verify before relying on it.

## Git Workflow

**Never commit or push directly to `main`.** Always create a feature branch, commit there, and open a PR. Run typecheck before opening a PR.

**Deploy edge functions via PR, never the CLI.** Don't run `supabase functions deploy`. Merging to `main` auto-deploys edge functions through `.github/workflows/deploy-edge-functions.yml`. Migrations likewise auto-apply on merge via `.github/workflows/apply-migrations.yml`.

## Commands

```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run web version
npm run lint           # ESLint
npm run format         # Prettier format
npm run format:check   # Check formatting
```

Builds & OTA (EAS):

```bash
eas build --profile development --platform ios   # Dev client
eas build --profile preview --platform ios       # TestFlight/store
eas build --profile production --platform ios    # Production
eas update --branch production                    # OTA update
```

No test framework is currently configured.

## Architecture

### Routing (Expo Router v6)

File-based routing in `app/`. Tab navigation via `(tabs)` group with custom `BottomNav` component (default tab bar hidden). Stack animations are disabled globally; screens manage their own transitions.

### Data Layer

All Supabase queries live in `lib/api.ts`. Query cache keys are centralized in `lib/query-keys.ts`. Custom hooks in `hooks/` wrap TanStack Query's `useQuery`/`useMutation`.

### Backend (Supabase)

**Edge Functions** (Deno, in `supabase/functions/`):

- `recipient-conversation` — AI conversation for extracting recipient data from natural language
- `generate-gift-suggestions` — AI gift recommendations

**Before modifying any edge function parser or response types**, query the active prompt from `system_prompt_versions` to confirm the real JSON schema. The prompt is the source of truth — never derive types from PM descriptions or assumptions.

```sql
SELECT prompt_text FROM system_prompt_versions
WHERE prompt_key = '<key>' AND is_active = true LIMIT 1;
```

**Critical:** `lib/supabase.ts` must import `react-native-url-polyfill/auto` as a standard import at the top of the file, before any Supabase imports. Never use `require()` for the polyfill. Never duplicate this import in other files. Never override `global.fetch` in the Supabase client config.

**Reasoning-model token budget.** For OpenAI reasoning models (`gpt-5*`, `o`-series, matched by `isReasoningOpenAIModel` in `supabase/functions/_shared/ai-client.ts`), `max_completion_tokens` is the **total** budget including hidden reasoning tokens — a tight budget tuned for visible output gets consumed by reasoning, returns empty content, and silently fires caller-side fallbacks. Keep the floor (currently 4000) and send `reasoning_effort: "low"`. Debugging heuristic: if an LLM flow "returns garbage," check `prompt_test_runs`/logs for the hardcoded fallback signature byte-for-byte — that means the AI call threw, not that the model misbehaved.

**Migrations vs. live schema.** Committed files in `supabase/migrations/` do not guarantee the change is live. The CI applier (`scripts/apply-migrations.mjs`) compares filename prefix only and **skips any version already recorded in `schema_migrations`** — so a recorded-but-unapplied migration can never be fixed by editing/re-merging that file; ship a **new** version with idempotent DDL (`ADD COLUMN IF NOT EXISTS …`). Always verify the object actually exists via `information_schema` (Supabase MCP `execute_sql`), not just `list_migrations`.

### Sibling backend repo (`be-gifted`)

Some backend lives in the sibling Next.js repo `be-gifted`, not here. The daily gift-generation cron and all `app_notifications` inserts live at `be-gifted/app/api/cron/generate-gifts/route.ts` (no notification inserts exist in `begifted-native`). When triaging notification timing, delivery, deep-linking, or gift-generation bugs, the fix likely belongs in that repo; the client here only renders `app_notifications` rows and handles taps (`app/(tabs)/notifications.tsx`, `hooks/use-push-notifications.ts`).

## Code Conventions

### UI Components — React Native Paper Only

All interactive UI must use React Native Paper components. This is strictly enforced:

- **Buttons:** `Button` from `react-native-paper` (modes: contained, outlined, text, elevated). Never use `TouchableOpacity`.
- **Text:** `Text` from `react-native-paper` with `variant` prop. Never style text with raw StyleSheet.
- **Inputs:** `TextInput` from `react-native-paper`. Never use RN's `TextInput`.
- **Dialogs:** `Dialog` from `react-native-paper`. Never use `Alert.alert()`. **Exception:** when precise centering/layout is required, use a plain RN `Modal` instead of Paper's `Dialog`.
- **Icons:** `MaterialIcons` from `@expo/vector-icons`. Never use Ionicons.

Core RN components (`View`, `ScrollView`, `FlatList`, `Image`) are allowed for layout only.

**Icon-button exception:** small icon-only press targets (overflow `...`, bell, avatar) may use `Pressable` + `MaterialIcons`. Existing patterns: `components/Header.tsx`, `components/home/OccasionOverflowButton.tsx`. The Paper rule above is for actual buttons.

### Implementing from Designs (Figma/PDF)

Before coding, confirm the intended interaction model and the exact components/icons (e.g., chat vs textarea, three-dots vs chevron, SVG vs `MaterialIcons`). Do not change colors or icons that the design does not specify.

**Verify design intent before writing a line.** For any UI work driven by a Figma/PDF spec, first summarize the intent back and wait for confirmation: which control triggers each action, exact colors/icons, layout/placement, and whether the flow is single-shot or chat. Do not assume — wrong inferences here (chevron vs three-dots, textarea vs full chat, off-spec button colors) have repeatedly caused rework. When the spec is ambiguous, ask rather than guess.

### TypeScript

- Use `type` for props, `interface` only when extension is needed
- Use `React.FC<Props>` for components
- Use top-level `import type { ... }` (not inline `import { type ... }`)
- No prop spreading — pass props explicitly
- Use function default arguments, not `defaultProps`

### Performance (React Compiler Enabled)

- **Do not use `useCallback` or `useMemo`** — React Compiler handles memoization automatically
- Derive state during render instead of using effect chains
- Use event handlers for user interactions, not `useEffect`
- Use `useRef` for stable values, DOM refs, and avoiding stale closures

### Styling

- Custom color palette in `lib/colors.ts`
- Custom MD3 theme: 18px border radius, black primary, gray secondary
- Prefer Paper component props over custom StyleSheet where possible
- After Prettier (or the auto-format hook) runs, review the diff and revert unrelated formatting churn so a PR contains only intentional changes — never let reflowed lines in untouched code ride along.

### GradientBackground — render per-screen, not at root

`<GradientBackground />` must be rendered inside the outermost `View` of every top-level screen and folder layout that wants the page gradient. **Do not** render it in `app/_layout.tsx`. Rendering it at the root re-introduces a tab bleed-through bug where inactive tab scenes visually stack behind the active one (`sceneStyle.backgroundColor` is transparent, so root gradients don't occlude). The root container has a `Colors.neutrals.dark` solid fill to cover the Header area instead.

Pattern:

```tsx
<View style={{ flex: 1 }}>
  <GradientBackground />
  {/* screen content */}
</View>
```

Existing references: tab scenes (`dashboard.tsx`, `calendar.tsx`, `notifications.tsx`), folder layouts (`contacts/_layout.tsx`, `settings/_layout.tsx`, `onboarding/_layout.tsx`, `admin/_layout.tsx`), standalone routes (`index.tsx`, `faq.tsx`).

### Fonts

All faces are loaded in `hooks/use-fonts-loader.ts` and exposed via `FontFamily` in `lib/typography.ts`. New work uses the redesign faces:

- **Poltawski Nowy** (`FontFamily.serif.*`, weights 400/500/600/700): display/serif — headlines, card titles.
- **DM Sans** (`FontFamily.sans.*`, weights 400/500/600): UI/sans — body, labels, CTAs.

Legacy faces are still loaded so older screens don't break, but **don't use them in new code**: **Fraunces** (`FontFamily.fraunces.*`, old display face), **RobotoFlex** (`FontFamily.body`), **AzeretMono** (`FontFamily.mono`, code-style accents only). Prefer the `Typography.*` tokens over referencing faces directly.

### Brand assets

- `components/BrandMark.tsx` — red oval BeGifted mark.
- `components/BrandWordmark.tsx` — typeset BEGIFTED wordmark.

Both inline their SVG paths via `react-native-svg`. The project does not have `react-native-svg-transformer` configured, so do not import SVGs directly as components. Source assets: `assets/images/BeGifted Logo Red.svg`, `assets/images/BeGifted wordmark.svg`.

### Design source

`BeGifted_mobile design refinements_050126.pdf` (repo root) is the source of truth for the home redesign and ongoing design refinements. When a palette match in `lib/colors.ts` isn't obvious, pixel-sample directly from the PDF using `pdftoppm` (poppler) + `magick` (ImageMagick); both are installed locally.

**Design tokens** are mirrored from the canonical Figma file `SUQTk93YAXlLo7NxkXC7Br` ("BeGifted pages_FINAL_for-dev"), node `28:47`: colors in `lib/colors.ts` (`Colors.brand.*`, `Colors.gradients.*`), typography in `lib/typography.ts` (`Typography.*`, `FontFamily`, `Radii`), spacing in `lib/spacing.ts` (`Spacing`, `DESIGN_FRAME_WIDTH`). The design frames are **402pt** wide (iPhone 16/17 Pro), so Figma point values map 1:1 to RN points. Prefer `Colors.brand.*`, `Typography.*`, and `Spacing.*` for new UI. The refresh procedure and full parity audit are documented in `docs/design-system.md` and `docs/design-parity-audit.md`. Superseded file: `vKruEWmOFcWGuYC8nHfsOU` ("BeGifted pages_2"). Note: the MD3 Paper theme in `app/_layout.tsx` still uses black/gray primary — not yet wired to brand teal.

### Path Aliases

`@/*` maps to the project root (configured in `tsconfig.json`).
