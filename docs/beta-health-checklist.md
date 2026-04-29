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

- [ ] **Replace `any` types in flow hooks** — 8+ instances; `React.RefObject<any>` → `React.RefObject<View>`, type `conversationContext`, `requestBody`, `occasions: any[]` → `Occasion[]`
  - Files: `hooks/use-conversation-flow.ts`, `hooks/use-add-recipient-flow.ts`, `hooks/use-add-occasion-flow.ts`, `hooks/use-occasion-recommendations.ts`

- [ ] **Standardize error handling in `lib/api.ts`** — 5 different patterns currently; standardize to throw, add error boundary in root layout
  - Files: `lib/api.ts`, `app/_layout.tsx`

- [x] **Align version strings** — `package.json` updated to `1.0.1` to match `app.json`.

---

## 🟡 Medium

- [x] **Delete dead code** — deleted `HamburgerMenu.tsx`, `ContentBlock.tsx`, `BrandGrid.tsx`, `Hero.tsx`, and `app/_archive/`.

- [ ] **Audit RecipientForm duplication** — `RecipientForm.tsx` (15KB) vs `RecipientDetailsForm.tsx`; consolidate or document distinction
  - Files: `components/RecipientForm.tsx`, `components/recipients/RecipientDetailsForm.tsx`

- [ ] **Split `admin/playground.tsx`** — 69KB; extract CIS card sections into sub-components
  - File: `app/admin/playground.tsx`

- [ ] **Add pagination to list queries** — `fetchRecipients`, `fetchOccasions`, `fetchNotifications` return all rows
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
