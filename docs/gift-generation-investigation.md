# Gift Generation Investigation — May 2026

## Problem

The admin playground's gift generation feature broke after two PRs landed on May 2:

- **PR #65** (`f6db8fd`) — Upgraded Anthropic web search tool + added `code_execution` tool
- **PR #66** (`198b245`) — Switched default OpenAI model from `gpt-4o` to `gpt-5`

### Errors seen

| Error                                                                              | Provider       | Root cause                                                                                                                                                                               |
| ---------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Auto-injecting tools would conflict with existing tool names: ['code_execution']` | Anthropic      | Anthropic API auto-injects `code_execution`; PR #65 also explicitly passed it → duplicate                                                                                                |
| `Request idle timeout limit (150s) reached`                                        | Anthropic      | Anthropic web search genuinely takes >120s; Supabase free tier has 150s wall-clock limit                                                                                                 |
| `Function failed due to not having enough compute resources`                       | OpenAI (gpt-5) | gpt-5 `/v1/responses` web search returns a massive JSON response (includes all raw search result content); `res.json()` loads it into memory → OOM in Supabase edge function (128MB RAM) |

## What Was Working Two Weeks Ago

Gift generation lived in the **be-gifted Vercel backend** (`lib/services/gift-generation.ts`), not in a Supabase edge function. It used `gpt-5` hardcoded with OpenAI web search via the OpenAI SDK. It worked because:

- Vercel has high memory limits (1GB+) and 300s timeout
- The OpenAI SDK handles response streaming internally

The Supabase `generate-gift-suggestions` edge function was added May 2 to support multi-provider testing in the playground — but Supabase's resource limits make it incompatible with large gpt-5 web search responses.

## PRs Landed as Fixes (May 2–3)

| PR  | Fix                                                                             | Status                                         |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| #67 | Removed duplicate `code_execution` tool from Anthropic web search               | ✅ Merged                                      |
| #68 | Added 120s AbortController timeout to Anthropic web search in Supabase function | ✅ Merged                                      |
| #69 | Routed playground gift gen to Vercel backend instead of Supabase function       | ✅ Merged — but broke provider/model selection |

## Current State After PR #69

Playground gift generation calls `https://be-gifted.vercel.app/api/admin/test-generate` (Vercel) instead of the Supabase edge function. This resolves the OOM and timeout, but **hardcodes gpt-5** — removing the ability to test Anthropic and Google.

## What the Playground Needs

The playground's purpose is to test:

- Different **system prompts** for gift generation (deployable to production)
- Different **providers** (OpenAI, Anthropic, Google)
- Different **models** (gpt-5, claude-sonnet-4-6, gemini-2.5-pro, etc.)

Hardcoding any model or provider defeats this purpose.

## Proposed Fix

Add multi-provider web search support to the Vercel backend. The Supabase edge function is not the right home for this — the Vercel backend already runs production gift generation and has the resource headroom.

### Files to change

**In `be-gifted` (Vercel backend):**

1. **`lib/ai/web-search-client.ts`** (new) — multi-provider web search client

   - OpenAI: use existing SDK (`openai.responses.create`)
   - Anthropic: raw fetch to `/v1/messages` with `web_search_20260209` tool, 240s timeout
   - Google: raw fetch to Gemini API with `googleSearch` tool, 240s timeout

2. **`lib/services/gift-generation.ts`** — update `generateGiftsForRecipient` to accept `overrideProvider` and `overrideModel`; fall back to reading from `app_config` table if no override (so production cron respects the admin-configured model)

3. **`app/api/admin/test-generate/route.ts`** — accept `overrideProvider` and `overrideModel` in request body, pass through to gift generation service

**In `begifted-native` (React Native app):**

4. **`hooks/use-prompt-playground.ts`** — add `overrideProvider: playgroundProvider` and `overrideModel: playgroundModel` to the Vercel fetch call

### Why Vercel and not Supabase edge functions

|                      | Supabase edge function | Vercel (be-gifted) |
| -------------------- | ---------------------- | ------------------ |
| Memory               | 128MB (free)           | 1GB+               |
| Timeout              | 150s wall-clock        | 300s               |
| gpt-5 web search     | OOM                    | ✅ Works           |
| Anthropic web search | Times out >120s        | ✅ 240s fits       |
| Multi-provider       | Already built (broken) | Needs to be added  |

### Note on production cron

The production cron (`/api/cron/generate-gifts`) currently hardcodes gpt-5. Once `gift-generation.ts` reads from `app_config`, the cron will automatically use whatever provider/model the admin has configured — same as the playground behavior.

## Decisions

- `ANTHROPIC_API_KEY` and `GOOGLE_AI_API_KEY` are now set in Vercel env for be-gifted. ✅
- Supabase `generate-gift-suggestions` edge function: **deprecate** (keep in repo, stop routing to it).

## Implementation Plan

### Step 1 — `be-gifted`: multi-provider web search client

Create `lib/ai/web-search-client.ts` with `callWithWebSearch(provider, model, opts)`.

- OpenAI: `openai.responses.create` (existing SDK)
- Anthropic: raw fetch, `web_search_20260209` tool, 240s timeout
- Google: raw fetch, Gemini `googleSearch` tool, 240s timeout

### Step 2 — `be-gifted`: update gift generation service

Update `lib/services/gift-generation.ts`:

- `GenerateGiftsOptions` gets `overrideProvider?: string` and `overrideModel?: string`
- If no override: read `ai_provider` / `ai_model` from `app_config` table (production cron picks this up automatically)
- Replace hardcoded `openai.responses.create` with `callWithWebSearch(provider, model, opts)`

### Step 3 — `be-gifted`: update test-generate route

Update `app/api/admin/test-generate/route.ts`:

- Accept `overrideProvider` and `overrideModel` in request body
- Pass through to `generateGiftsForRecipient`

### Step 4 — `begifted-native`: update playground hook

Update `hooks/use-prompt-playground.ts`:

- Add `overrideProvider: playgroundProvider` and `overrideModel: playgroundModel` to the Vercel fetch body
