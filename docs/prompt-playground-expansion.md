# Expand Prompt Playground to Key LLM Prompts

## Context

The app has multiple LLM prompts across edge functions, but only the gift generation prompt can be edited/tested/deployed via the admin playground. We're expanding the unified playground to cover the 4 highest-impact prompts — the ones that directly shape user-facing output and interactions.

## Target Prompts (4)

| # | Key | Location | Purpose | Model |
|---|-----|----------|---------|-------|
| 1 | `gift_generation_system` | `use-prompt-playground.ts:17` | Gift suggestions system prompt (already supported) | via Vercel |
| 2 | `add_recipient_conversation` | `data-extractor.ts:197` | Guide add-recipient chat flow | gpt-4o-mini |
| 3 | `occasion_recommendations` | `data-extractor.ts:746` | Suggest real occasions for recipient | gpt-4o-mini |
| 4 | `user_preferences_extraction` | `extract-user-preferences/index.ts:93` | Extract gifting style preferences | gpt-4o-mini |

**Out of scope** (mechanical/structural, low refinement value): quick context analysis, update field conversation, critical fields extraction, full recipient extraction, meta prompt refinement.

## Approach: Unified Playground with Prompt Selector

One playground, one prompt selector dropdown at the top. The center panel (prompt editor + refinement chat) and right panel (results + history) stay the same structurally. The left context panel swaps based on prompt type. Template variables (like `{{conversationHistory}}`) are shown as read-only documentation chips — no mock interpolation for now.

---

## Implementation Plan

### Phase 1: Prompt Registry + DB Migration

- [ ] **New file: `lib/prompt-registry.ts`** — Define a `PromptDefinition` type and `PROMPT_REGISTRY` array with the 4 entries. Each entry has:
  - `key` — DB prompt_key
  - `label` — display name
  - `description` — one-liner for the dropdown
  - `defaultPrompt` — the current hardcoded prompt text (extracted from edge functions)
  - `templateVariables` — list of `{{var}}` names used at runtime (documentation only)
  - Export a `getPromptByKey(key)` helper.

- [ ] **New migration: `supabase/migrations/YYYYMMDD_prompt_playground_multi_key.sql`**
  - Add `prompt_key` column to `prompt_test_runs` (nullable, default `'gift_generation_system'` for existing rows)

- [ ] **Update `lib/api.ts`**: add `prompt_key` to `PromptTestRun` type, filter `fetchPromptTestRuns` by key

- [ ] **Update `lib/query-keys.ts`**: `promptTestRuns: (userId, promptKey) => [...]`

### Phase 2: Generalize the Hook

- [ ] **File: `hooks/use-prompt-playground.ts`**
  - Add `selectedPromptKey` state (default `"gift_generation_system"`) + setter
  - Look up `PromptDefinition` from registry to get `defaultPrompt`
  - Replace all hardcoded `"gift_generation_system"` with `selectedPromptKey`
  - CIS-specific queries (`cisPreviewQuery`, `editedCis`, `setCisField`) — gate with `enabled: selectedPromptKey === "gift_generation_system"`
  - On prompt key change: reset `currentPrompt`, `chatMessages`, `generationResult`, load active deployed version for the new key
  - Keep `generateWithPrompt()` for gift generation; disable Generate for other types initially

### Phase 3: Update the Playground UI

- [ ] **3a. Prompt selector in header** (`app/admin/playground.tsx`)
  - Add a `Menu` (React Native Paper) dropdown listing the 4 prompts
  - Selecting a prompt calls the hook's `setSelectedPromptKey`

- [ ] **3b. Swap the context panel**
  - Gift generation: existing CIS panel (unchanged)
  - Other 3 prompts: simplified panel showing the prompt's description + `templateVariables` as read-only `Chip` components with a "Variables available at runtime" label

- [ ] **3c. Generalize the results panel**
  - Gift generation: existing suggestion card rendering (unchanged)
  - Other prompts: pretty-print JSON result in a `Card` with monospace text

- [ ] **3d. Deploy works for all prompt types** (the deploy infrastructure already supports any `prompt_key`)

### Phase 4: Edge Functions Read from DB

- [ ] **New file: `supabase/functions/_shared/prompt-loader.ts`**
  ```ts
  export async function loadActivePrompt(
    supabaseClient: SupabaseClient,
    promptKey: string,
    fallback: string
  ): Promise<string>
  ```
  Queries `system_prompt_versions` for `is_active = true` and matching `prompt_key`. Returns `prompt_text` if found, `fallback` otherwise.

- [ ] **Update `data-extractor.ts`** (2 prompts):
  - `add_recipient_conversation`: load from DB via `loadActivePrompt`, fall back to current `buildAddRecipientPrompt()` text. Template variables (`{{contextInfo}}`, `{{conversationHistory}}`, `{{messageCount}}`) get string-replaced at runtime.
  - `occasion_recommendations`: load from DB, fall back to current hardcoded prompt.

- [ ] **Update `extract-user-preferences/index.ts`**:
  - `loadActivePrompt(supabase, "user_preferences_extraction", HARDCODED_FALLBACK)`

- [ ] **Update `refine-prompt/index.ts`**:
  - Accept optional `promptCategory` in request body
  - Append category-specific guidance so refinement chat gives appropriate advice per prompt type

### Phase 5: Add Testing for Non-Gift Prompts

- [ ] **5a. Add `customSystemPrompt` support to edge functions**
  - Update `recipient-conversation` and `extract-user-preferences` to accept an optional `customSystemPrompt` field. When present, use it instead of loading from DB. This lets the playground test before deploying.

- [ ] **5b. Expand `generateWithPrompt()` in the hook**
  - `gift_generation_system`: existing Vercel backend (unchanged)
  - `add_recipient_conversation`: call `recipient-conversation` edge function with mock messages + `customSystemPrompt`
  - `occasion_recommendations`: call edge function with recipient data + `customSystemPrompt`
  - `user_preferences_extraction`: call `extract-user-preferences` with sample text + `customSystemPrompt`

- [ ] **5c. Simple test input panels** (replace CIS panel for non-gift prompts):
  - `add_recipient_conversation`: simple mock message builder (text input + add button)
  - `occasion_recommendations`: recipient selector dropdown
  - `user_preferences_extraction`: multiline `TextInput` to paste sample user description

### Phase 6: Version History for All Prompts

- [ ] **File: `app/admin/prompts.tsx`**
  - Replace hardcoded `PROMPT_KEY = "gift_generation_system"` with a selector
  - Add prompt key dropdown matching the playground's selector
  - Filter version history by selected prompt key

---

## Critical Files to Modify

- `lib/prompt-registry.ts` — **new**, central registry of 4 prompts
- `hooks/use-prompt-playground.ts` — generalize with `selectedPromptKey`
- `app/admin/playground.tsx` — add selector, swap context panels
- `app/admin/prompts.tsx` — support multiple prompt keys
- `supabase/functions/_shared/prompt-loader.ts` — **new**, DB prompt loading
- `supabase/functions/recipient-conversation/data-extractor.ts` — read 2 prompts from DB
- `supabase/functions/extract-user-preferences/index.ts` — read prompt from DB
- `supabase/functions/refine-prompt/index.ts` — category-aware meta prompt
- `lib/api.ts` — add `prompt_key` to test runs
- `lib/query-keys.ts` — scope test run keys by prompt key

## Sequencing

```
Phase 1 (registry + migration)    — foundation, no UI impact
        ↓
Phase 2 (hook) + Phase 3 (UI)     — playground becomes multi-prompt
        ↓
Phase 4 (edge functions read DB)   — deployed prompts take effect (can parallel with 2+3)
        ↓
Phase 5 (testing non-gift)         — full test capability
        ↓
Phase 6 (version history)          — polish
```

## Verification

1. Open playground → prompt selector shows all 4 prompts
2. Select each prompt → correct default text loads, template variables shown as chips
3. Edit a non-gift prompt → refinement chat works, Deploy button activates
4. Deploy a prompt → version appears in version history, edge function uses it on next call
5. Gift generation flow unchanged — existing CIS panel, Generate, and results still work
6. Test each non-gift prompt from playground with sample input → results display as JSON
