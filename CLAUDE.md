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

Three faces are loaded in `hooks/use-fonts-loader.ts`:
- **Fraunces** (serif): use `Fraunces_600SemiBold` for prominent display titles (hero headlines, card titles).
- **RobotoFlex** (sans): body text, section labels.
- **AzeretMono** (monospace): code-style accents only — not the brand wordmark.

### Brand assets

- `components/BrandMark.tsx` — red oval BeGifted mark.
- `components/BrandWordmark.tsx` — typeset BEGIFTED wordmark.

Both inline their SVG paths via `react-native-svg`. The project does not have `react-native-svg-transformer` configured, so do not import SVGs directly as components. Source assets: `assets/images/BeGifted Logo Red.svg`, `assets/images/BeGifted wordmark.svg`.

### Design source

`BeGifted_mobile design refinements_050126.pdf` (repo root) is the source of truth for the home redesign and ongoing design refinements. When a palette match in `lib/colors.ts` isn't obvious, pixel-sample directly from the PDF using `pdftoppm` (poppler) + `magick` (ImageMagick); both are installed locally.

### Path Aliases

`@/*` maps to the project root (configured in `tsconfig.json`).
