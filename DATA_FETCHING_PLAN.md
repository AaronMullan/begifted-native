# Data Fetching Strategy: Options and Implementation Plan

## Current State

- **Stack**: Expo 54, React 19, expo-router, Supabase (auth, Postgres, Edge Functions).
- **Data sources**: Supabase `profiles`, `recipients`, `occasions`, `gift_suggestions`; Edge Function `recipient-conversation` for extraction.
- **Patterns today**:
  - **Auth**: `getSession` + `onAuthStateChange` duplicated in ~10 screens; only [`contacts/add.tsx`](begifted/app/contacts/add.tsx) uses [`useAuth`](begifted/hooks/use-auth.ts).
  - **Fetching**: Manual `useState` + `useEffect` + `supabase.from().select()` in each screen. No shared cache or request deduplication.
  - **Dashboard**: Custom AsyncStorage cache (10 min TTL) + background refetch + ref-based dedup in [`dashboard.tsx`](begifted/app/dashboard.tsx).
  - **Mutations**: Direct Supabase `insert`/`update`/`upsert`/`delete` in contacts, profile, settings, [`use-add-recipient-flow`](begifted/hooks/use-add-recipient-flow.ts), etc. No cache invalidation.

**Pain points**: Repeated auth logic, redundant fetches (e.g. recipients on Contacts + Dashboard + Calendar), no shared cache, manual loading/error handling, and no systematic invalidation after mutations.

---

## Options

### Option A: TanStack Query (React Query) — **Recommended**

**Package**: `@tanstack/react-query`

**Pros**:
- Industry-standard server-state library; works well with Supabase and React Native/Expo.
- Built-in caching, request deduplication, stale-while-revalidate, background refetch.
- Mutations with `invalidateQueries` (and optional optimistic updates) keep UI in sync.
- `QueryClient` supports persistence (e.g. AsyncStorage) if you want offline-ish behavior later.
- DevTools for debugging cache/refetches.

**Cons**: New dependency, need to learn query keys, mutations, and provider setup.

**Fit**: Multiple screens use the same entities (recipients, occasions, profile). Mutations (add/edit/delete recipient, update profile/settings) should invalidate lists and detail views. Your dashboard "cache then refetch" pattern maps directly to SWR.

---

### Option B: SWR

**Package**: `swr`

**Pros**: Lighter API, stale-while-revalidate, request deduplication, works in React Native.

**Cons**: Mutations and cache updates are more manual; less built-in structure than TanStack Query. You'd still need to orchestrate invalidation and possibly a small persistence layer.

**Fit**: Good if you prefer minimal API surface and are fine wiring invalidation yourself.

---

### Option C: Refactor only (no new packages)

**Approach**: Use `useAuth` everywhere, add custom hooks like `useRecipients`, `useOccasions`, `useProfile`, etc. that wrap `useState`/`useEffect` + Supabase calls.

**Pros**: No new deps, less duplication, clearer separation of fetch logic.

**Cons**: No request dedup, no shared cache, manual loading/error per hook. Dashboard cache stays custom. Each screen still fetches independently; mutation invalidation is ad hoc.

**Fit**: Acceptable short-term improvement, but you keep most of the current limitations.

---

### Option D: Supabase Realtime (add-on)

**Approach**: Use `supabase.channel().on('postgres_changes', ...)` for `recipients`, `occasions`, etc.

**Pros**: Live updates when data changes (e.g. from another device or tab).

**Cons**: Does not replace a fetch/cache layer. Typically used *with* Option A or B: initial load + cache via RQ/SWR, Realtime for invalidation or direct cache updates.

**Fit**: Optional enhancement after Option A or B is in place.

---

## Recommendation: TanStack Query

Option A gives you the biggest improvement with manageable scope: centralised server state, shared cache, clean invalidation, and a path to Realtime (Option D) later. The rest of this plan assumes **TanStack Query** as the primary data-fetching layer.

---

## Implementation Plan

### 1. Install and wire TanStack Query

- Add `@tanstack/react-query` in [`begifted/package.json`](begifted/package.json).
- Wrap the app in `QueryClientProvider` in [`begifted/app/_layout.tsx`](begifted/app/_layout.tsx) (inside `PaperProvider`). Create a `QueryClient` with sensible defaults (e.g. `staleTime`, `gcTime`).

### 2. Query keys factory

- Add a small module (e.g. `lib/query-keys.ts`) defining a query-key factory:
  - `auth`, `profile`, `recipients`, `recipients.detail(id)`, `occasions`, `dashboardStats`, `giftSuggestions(recipientId)`.
- Use these keys consistently in hooks and `invalidateQueries` so cache invalidation is predictable.

### 3. Supabase fetch layer

- Add `lib/api.ts` (or `api/` folder) with pure async functions that call Supabase:
  - `fetchRecipients(userId)`, `fetchRecipient(userId, id)`, `fetchOccasions(userId)`, `fetchProfile(userId)`, `fetchDashboardStats(userId)`, `fetchGiftSuggestions(recipientId)`.
- Keep Edge Function calls (`recipient-conversation`) as explicit async functions; they can be used inside `useMutation` later.

This keeps Supabase usage in one place and makes it easy to test or swap implementations.

### 4. Auth: use `useAuth` everywhere

- Replace all inline `getSession` + `onAuthStateChange` usage with `useAuth()` from [`use-auth.ts`](begifted/hooks/use-auth.ts).
- Optionally extend `useAuth` to expose `session` if any caller needs it (e.g. for `user.id`).
- Gate data fetching on `user`: only run queries when `user` is present.

### 5. Query hooks

- Implement hooks that use `useQuery` and the fetch layer:
  - `useRecipients()` — list; enabled when `user` exists.
  - `useRecipient(id)` — detail; enabled when `user` and `id` exist.
  - `useOccasions()` — calendar occasions; enabled when `user` exists.
  - `useProfile()` — profile; enabled when `user` exists.
  - `useDashboardStats()` — aggregations (recipients count, upcoming count, username); enabled when `user` exists.
  - `useGiftSuggestions(recipientId)` — enabled when `recipientId` exists.

Each hook uses the query-key factory and the corresponding fetch function. Pass `userId` from `useAuth` into fetch functions as needed.

### 6. Migrate read-heavy screens

- **Dashboard**: Remove AsyncStorage cache and `fetchUserData` / `loadDashboardData`. Use `useAuth` + `useDashboardStats()`. RQ cache replaces your custom cache; use `staleTime` to control refetch behaviour.
- **Contacts**: Use `useAuth` + `useRecipients()`. Remove local `fetchRecipients` and related state.
- **Calendar**: Use `useAuth` + `useOccasions()`. Remove local `fetchOccasions` and related state.
- **Contacts [id]**: Use `useRecipient(id)` for detail and `useGiftSuggestions(recipientId)` for suggestions. Remove local fetch logic and duplicate loading state.
- **Settings (profile, gifting, notifications)**: Use `useAuth` + `useProfile()` (or specific hooks if you split profile vs preferences). Remove duplicate auth and fetch logic.

Keep UI structure; mainly replace `useState`/`useEffect` fetch logic with hooks and handle `isLoading` / `isError` / `data` from `useQuery`.

### 7. Mutations and invalidation

- **Recipients**:
  - Add recipient: keep logic in `use-add-recipient-flow` (or extract to a `useCreateRecipient` mutation). On success, `queryClient.invalidateQueries({ queryKey: ['recipients'] })` and `['dashboardStats']`; optionally invalidate `['occasions']` if you create occasions.
  - Update/delete in [`contacts.tsx`](begifted/app/contacts.tsx) and [`contacts/[id].tsx`](begifted/app/contacts/[id].tsx): use `useMutation` wrapping Supabase updates/deletes. On success, invalidate `['recipients']`, `['recipients', 'detail', id]`, `['dashboardStats']`, and `['occasions']` as appropriate.
- **Profile / settings**: Use `useMutation` for profile, gifting, notification upserts. On success, invalidate `['profile']` and `['dashboardStats']` if dashboard shows profile-derived data.
- **Gift suggestions**: Delete in [id]: use `useMutation`; on success, invalidate `['giftSuggestions', recipientId]`.

Use a shared `useQueryClient()` in mutation hooks or pass `queryClient` from the component.

### 8. Edge Function `recipient-conversation`

- Keep `useConversationFlow` and the Edge Function call as-is.
- When a new recipient (and possibly occasions) is created in `use-add-recipient-flow`, add the same `invalidateQueries` calls as in step 7 for add-recipient.
- Optionally wrap the "extract + save" flow in a `useMutation` if you want consistent loading/error handling and invalidation in one place.

### 9. Optional: Realtime (later)

- Subscribe to `recipients` and `occasions` changes via Supabase Realtime.
- On `INSERT`/`UPDATE`/`DELETE`, call `queryClient.invalidateQueries` for the relevant keys (e.g. `['recipients']`, `['occasions']`, `['dashboardStats']`). No change to the fetch layer; Realtime only triggers refetches or granular cache updates.

### 10. Cleanup

- Remove dashboard AsyncStorage cache helpers from [`dashboard.tsx`](begifted/app/dashboard.tsx).
- Remove redundant auth logic from migrated screens.
- Delete any now-unused fetch helpers or duplicate types.

---

## Summary

| Aspect | Before | After (TanStack Query) |
|--------|--------|------------------------|
| Auth | Duplicated in many screens | `useAuth` everywhere |
| Fetching | Manual useState/useEffect per screen | Shared hooks + `useQuery` |
| Cache | Dashboard-only, custom | Global RQ cache, configurable |
| Dedup | None | Automatic per query key |
| Mutations | Direct Supabase, no invalidation | `useMutation` + `invalidateQueries` |
| Realtime | None | Optional add-on later |

**New dependency**: `@tanstack/react-query`. No Supabase or Expo changes required.

---

## Files to Touch (high level)

- **Add**: `lib/query-keys.ts`, `lib/api.ts` (or `api/*`), query hooks (e.g. `hooks/use-recipients.ts`, `hooks/use-occasions.ts`, etc.), mutation hooks where you centralise mutations.
- **Edit**: `_layout.tsx` (provider), `dashboard.tsx`, `contacts.tsx`, `calendar.tsx`, `contacts/[id].tsx`, settings (profile, gifting, notifications), `use-add-recipient-flow`, and any other screen that fetches or mutates.
- **Remove**: Dashboard cache helpers, duplicate auth and fetch logic in migrated screens.

This plan is scalable: you can migrate screen-by-screen and add Realtime when needed, without big rewrites.
