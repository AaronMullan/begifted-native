# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BeGifted is a gift-planning mobile app built with Expo SDK 54, React Native 0.81, React 19, and TypeScript. It uses Supabase for auth/database, TanStack Query for server state, React Native Paper for UI, and Expo Router for file-based navigation.

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

**EAS Build:**
```bash
eas build --profile development --platform ios   # Dev client
eas build --profile preview --platform ios       # TestFlight/store
eas build --profile production --platform ios    # Production
eas update --branch production                   # OTA update
```

No test framework is currently configured.

## Architecture

### Routing (Expo Router v6)

File-based routing in `app/`. Tab navigation via `(tabs)` group with custom `BottomNav` component (default tab bar hidden). Stack animations are disabled globally; screens manage their own transitions.

- `app/index.tsx` — Auth/entry screen
- `app/(tabs)/dashboard.tsx` — Home
- `app/(tabs)/contacts/` — Recipients list, detail (`[id].tsx`), add flow
- `app/(tabs)/calendar.tsx` — Occasions
- `app/(tabs)/settings/` — Settings hub and sub-screens

### Data Layer

All Supabase queries live in `lib/api.ts`. Query cache keys are centralized in `lib/query-keys.ts`. Custom hooks in `hooks/` wrap TanStack Query's `useQuery`/`useMutation`.

**Key hooks:** `use-auth`, `use-recipients`, `use-recipient`, `use-profile`, `use-occasions`, `use-gift-suggestions`, `use-conversation-flow`, `use-add-recipient-flow`

**Mutation hooks:** `use-recipient-mutations`, `use-profile-mutations` — handle create/update/delete with cache invalidation via query keys.

Query client is configured with 5-min stale time, 30-min GC, and persists to AsyncStorage (24-hour max age) via `lib/query-persister.ts`.

### Provider Stack (`app/_layout.tsx`)

`PersistQueryClientProvider` → `PaperProvider` (with custom MD3 theme) → `Stack`. Gradient background and Header are rendered outside the Stack for persistence across routes.

### Backend (Supabase)

**Tables:** `profiles`, `recipients`, `occasions`, `gift_suggestions`, `user_preferences`, `user_push_tokens`

**Edge Functions** (Deno, in `supabase/functions/`):
- `recipient-conversation` — AI conversation for extracting recipient data from natural language
- `generate-gift-suggestions` — AI gift recommendations

**Critical:** `lib/supabase.ts` must import `react-native-url-polyfill/auto` as a standard import at the top of the file, before any Supabase imports. Never use `require()` for the polyfill. Never duplicate this import in other files. Never override `global.fetch` in the Supabase client config.

### Types

Shared types in `types/recipient.ts`. API-layer types (`Profile`, `Occasion`) are defined in `lib/api.ts`. Component prop types are co-located with their components.

## Code Conventions

### UI Components — React Native Paper Only

All interactive UI must use React Native Paper components. This is strictly enforced:
- **Buttons:** `Button` from `react-native-paper` (modes: contained, outlined, text, elevated). Never use `TouchableOpacity`.
- **Text:** `Text` from `react-native-paper` with `variant` prop. Never style text with raw StyleSheet.
- **Inputs:** `TextInput` from `react-native-paper`. Never use RN's `TextInput`.
- **Dialogs:** `Dialog` from `react-native-paper`. Never use `Alert.alert()`.
- **Icons:** `MaterialIcons` from `@expo/vector-icons`. Never use Ionicons.

Core RN components (`View`, `ScrollView`, `FlatList`, `Image`) are allowed for layout only.

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
- `GradientBackground` component for app background
- Prefer Paper component props over custom StyleSheet where possible

### Path Aliases

`@/*` maps to the project root (configured in `tsconfig.json`).
