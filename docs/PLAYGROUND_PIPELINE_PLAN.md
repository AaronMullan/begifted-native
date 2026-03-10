# Connect Prompt Playground to Real Generation Pipeline

## Problem

The prompt playground calls a legacy Supabase edge function that uses GPT-4o with no web search, producing hallucinated product URLs. The real production pipeline lives in the Vercel backend (`be-gifted`) and uses GPT-5 + web search via the OpenAI Responses API, returning verified URLs.

## Goal

- Playground uses the same GPT-5 + web search pipeline as production
- System prompt is DB-driven (`system_prompt_versions` table) — not hardcoded
- Playground edits deployed via "Deploy to Production" are immediately live for real gift generation

## Architecture

```
Native App (playground)
  → POST be-gifted.vercel.app/api/admin/test-generate
    → buildCISFromRecipient()
    → generateGiftsForRecipient(cis, { systemPromptOverride })
    → GPT-5 + web_search → real product URLs
    → returns results (not stored in gift_suggestions)
  → playground hook persists results to prompt_test_runs table

Production gift generation
  → POST be-gifted.vercel.app/api/generate-gifts
    → buildCISFromRecipient()
    → generateGiftsForRecipient(cis)
      → reads active prompt from system_prompt_versions
      → falls back to BeGiftedProtocolV1 if DB read fails
    → GPT-5 + web_search → real product URLs
    → stores to gift_suggestions, sends push notification
```

---

## Checklist

### Pre-work: Git cleanup (begifted-native)

- [ ] Remove `supabase/functions/generate-gift-suggestions/` from repo (unused legacy, production uses Vercel backend). Keep deployed function on Supabase for now.
- [ ] Add `.claude/` and `supabase/.temp/` to `.gitignore`
- [ ] Commit playground UI fixes + migrations + plan doc + cleanup
- [ ] Push to develop

---

### be-gifted (Vercel backend)

- [ ] **Modify `lib/services/gift-generation.ts`**
  - Add `systemPromptOverride?: string` to `GenerateGiftsOptions`
  - When override provided: use it instead of `BeGiftedProtocolV1`
  - When no override: read active prompt from `system_prompt_versions` (key: `gift_generation_system`, `is_active = true`) via `supabaseAdmin`
  - Fall back to `BeGiftedProtocolV1` if DB read fails
  - Existing code: `supabaseAdmin` from `lib/supabase/server.ts`

- [ ] **Create `app/api/admin/test-generate/route.ts`**
  - POST: `{ recipientId: string, customSystemPrompt?: string }`
  - Fetch recipient via `supabaseAdmin`
  - Build CIS via `buildCISFromRecipient` (from `lib/utils/cis-builder.ts`)
  - Call `generateGiftsForRecipient(cis, { systemPromptOverride: customSystemPrompt })`
  - Return results only — NO `storeGiftSuggestions`, NO occasion tracking, NO push notifications
  - Results are persisted client-side to `prompt_test_runs` by the playground hook (already implemented)
  - Include CORS headers

- [ ] **Commit and deploy to Vercel**

### begifted-native (mobile/web app)

- [ ] **Create migration `supabase/migrations/20260310_sync_protocol_v1_prompt.sql`**
  - Update active `gift_generation_system` row with `BeGiftedProtocolV1` text
  - This replaces the old edge function prompt currently in the DB

- [ ] **Run migration: `supabase db push`**

- [ ] **Update `hooks/use-prompt-playground.ts`**
  - Change `generateWithPrompt()` to call `https://be-gifted.vercel.app/api/admin/test-generate` via `fetch()` instead of `supabase.functions.invoke("generate-gift-suggestions")`
  - Send `{ recipientId, customSystemPrompt }` — backend handles recipient data + CIS
  - Update `DEFAULT_SYSTEM_PROMPT` to match `BeGiftedProtocolV1`

- [ ] **Update `app/admin/playground.tsx` — results display**
  - New response shape: `{ status, suggestions: [{ name, retailer, url, price_usd, category, tags, reason, image_url? }] }`
  - Use `suggestion.url` for product links (these are real, web-searched URLs)
  - Use `suggestion.price_usd` (number) instead of `estimatedPrice` (string)
  - Use `suggestion.reason` instead of `reasoning`

- [ ] **Commit and push to develop**

### Verification

- [ ] In playground: select a recipient, generate — results have real product URLs
- [ ] Product links work (not 404s)
- [ ] Modify prompt in playground, deploy to production
- [ ] Trigger a normal gift generation from the app — verify it uses the new DB prompt
- [ ] Rollback prompt version — verify production reverts

---

## Key files reference

| Repo | File | Purpose |
|------|------|---------|
| be-gifted | `lib/services/gift-generation.ts` | `generateGiftsForRecipient` — GPT-5 + web search call |
| be-gifted | `lib/utils/cis-builder.ts` | `buildCISFromRecipient` — builds context from recipient data |
| be-gifted | `lib/prompts/beGiftedProtocolV1.ts` | Current hardcoded system prompt |
| be-gifted | `lib/supabase/server.ts` | `supabaseAdmin` — service role client |
| be-gifted | `lib/openai/client.ts` | OpenAI SDK client (240s timeout) |
| be-gifted | `lib/types/api.ts` | `ApiResult`, `Suggestion`, `CIS` types |
| begifted-native | `hooks/use-prompt-playground.ts` | Playground state management hook |
| begifted-native | `app/admin/playground.tsx` | Playground UI |

## Future consideration

Consolidate the generation pipeline into a single location (either all Supabase edge functions or all Vercel backend). Currently two independent pipelines exist — the edge function is unused legacy code.
