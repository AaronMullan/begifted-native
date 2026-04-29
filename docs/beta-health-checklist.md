# Beta Readiness — Health Checklist

Generated from a full codebase audit. Work through items top-to-bottom; check off as done.

---

## 🔴 Critical

- [x] **Audit `.env` git history** — only `EXPO_PUBLIC_FAQ_SHEET_ID` (public) was ever committed; Jira token was never in git history. No action needed.

- [x] **Notifications screen** — screen already existed; fixed `useEffect` dependency bug (`[unreadCount > 0]` → `[unreadCount, markAllRead]`).

- [x] **Fix npm vulnerabilities** — ran `npm audit fix`; remaining 20 moderate issues are all in Expo's own packages, unfixable without breaking changes (acceptable).

---

## 🟠 High

- [x] **Add `onError` to all mutation hooks** — added `console.error` default to all 6 mutations; fixed silent `.catch(() => {})` in profile synthesis to log the error.
  - Files: `hooks/use-profile-mutations.ts`, `hooks/use-recipient-mutations.ts`, `hooks/use-occasion-mutations.ts`

- [x] **Replace `any` types in flow hooks** — `React.RefObject<View | null>`, `string | null` for `conversationContext`, `ConversationRequestBody` for `requestBody`, `NonNullable<ExtractedData["occasions"]>` for occasions; removed dead `scrollToEnd` call; `(error as { context?: Response })` in occasion recommendations.
  - Files: `hooks/use-conversation-flow.ts`, `hooks/use-add-recipient-flow.ts`, `hooks/use-add-occasion-flow.ts`, `hooks/use-occasion-recommendations.ts`, `components/recipients/conversation/ConversationView.tsx`

- [x] **Standardize error handling in `lib/api.ts`** — `fetchUserPreferences` and `fetchProfile` (non-406) now throw; `fetchOccasions` throws real DB errors, returns `[]` only for network/timeout; `fetchIsAdmin`/`fetchActiveSystemPrompt` retain silent defaults (intentional fail-safe). Added `ErrorBoundary` class component in root layout.
  - Files: `lib/api.ts`, `app/_layout.tsx`

- [x] **Align version strings** — `package.json` updated to `1.0.1` to match `app.json`.

---

## 🟡 Medium

- [x] **Delete dead code** — deleted `HamburgerMenu.tsx`, `ContentBlock.tsx`, `BrandGrid.tsx`, `Hero.tsx`, and `app/_archive/`.

- [x] **Audit RecipientForm duplication** — extracted shared `RecipientFields` component; both forms use it. Standardized all onChange props to `onChangeName` convention. `RecipientForm` = create/edit modal (contacts list); `RecipientDetailsForm` = full detail screen with occasions + delete.
  - Files: `components/recipients/RecipientFields.tsx` (new), `components/RecipientForm.tsx`, `components/recipients/RecipientDetailsForm.tsx`, `app/(tabs)/contacts/index.tsx`

- [x] **Split `admin/playground.tsx`** — extracted CIS card (4 sections + all local state + handlers) into `components/admin/CisCard.tsx`; playground.tsx reduced from 2231 → 1787 lines.
  - Files: `components/admin/CisCard.tsx` (new), `app/admin/playground.tsx`, `hooks/use-prompt-playground.ts` (exported `CISPreview`)

- [ ] **Add pagination to list queries** — `fetchRecipients` has no limit; `fetchNotifications` already has `.limit(50)`; `fetchOccasions` is bounded by a 90-day date filter. For beta user counts `fetchRecipients` is acceptable unbounded, but add `.limit(500)` safety cap before wider launch.
  - File: `lib/api.ts`

---

## ⚪ Post-Beta

- [ ] **Optimistic updates** — `onMutate` in `useCreateRecipient`, `useDeleteRecipient`, `useUpdateOccasion`
- [ ] **Edge function telemetry** — structured logging with request IDs and latency
- [ ] **Admin management UI** — replace SQL-based `is_admin` flag with an admin screen

---

## ✅ Already Healthy (No Action Needed)

- TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`, `strict`)
- Query key factory pattern — complete, TanStack best practices
- Supabase RLS — proper user isolation, admin role correct
- Hooks organized by concern
- No TODO/FIXME/HACK comments
- Pre-commit hooks (husky + lint-staged) active
- EAS build profiles for dev/preview/production
- Edge functions complete and consistent
- Query persistence via AsyncStorage
- React Compiler enabled
- All API functions are actively used
- `app.json` production config complete
