# Plan: Align Prompt Playground with Production

## Context

The PM reports that the prompt editing tools are unreliable because they don't match actual production behavior. After investigating both repos (`begifted-native` and `be-gifted`), I found several concrete alignment gaps between what the playground shows/tests and what actually runs in production.

---

## Alignment Gaps Found

### Gap 1: `add_recipient_conversation` has two different prompts
- **Playground/DB path**: Simple template with `{{contextInfo}}`, `{{conversationHistory}}`, `{{messageCount}}`
- **Production fallback** (`buildAddRecipientPrompt()`, data-extractor.ts:351-403): Sophisticated prompt with readiness-state logic, priority ordering, one-ask-per-message rule, state-specific guidance, critical wrap-up rules
- When the PM deploys a prompt, it uses the simple template — missing all the production sophistication
- Also: when `readiness.state === "ready"`, the edge function returns a deterministic message and **never uses the prompt at all** (data-extractor.ts:213-221) — the PM doesn't know this

### Gap 2: Gift generation wrapper is invisible to PM
- `generateGiftsForRecipient()` (be-gifted, gift-generation.ts:141-167) sends TWO system messages: the protocol prompt (what PM edits) AND a wrapper with persona, tone, max results, avoid list, and CIS data
- PM only sees/edits the protocol prompt, unaware of the wrapper

### Gap 3: Playground testing skips cron behaviors
- Playground test calls `generateGiftsForRecipient()` directly
- Cron calls `generateAndStoreGifts()` which adds duplicate filtering, avoid lists from existing suggestions, and retry logic
- PM may get unrealistically clean results in testing

### Gap 4: No visibility into resolved template variables
- For conversation prompts, PM sees `{{contextInfo}}` but never sees what it resolves to after testing

---

## Implementation Plan

### Phase 1: Unify `add_recipient_conversation` prompt (highest priority)

**Goal**: Eliminate `buildAddRecipientPrompt()` — make the DB-stored template the single source of truth, with the same sophistication as the current hardcoded function.

**Files to modify:**

1. **`supabase/functions/recipient-conversation/data-extractor.ts`**
   - Add helper functions to pre-compute dynamic content as strings:
     - `buildStateGuidance(readinessState, contextInfo)` — returns the state-specific guidance block
     - `buildPriorityGuidance(contextInfo)` — returns the priority-order block with date follow-up text
   - Expand template variable substitution (lines 229-232) to include: `{{readinessState}}`, `{{stateGuidance}}`, `{{priorityGuidance}}`, `{{recipientName}}`
   - Make both the `customSystemPrompt` path AND the production DB path use the same expanded substitution
   - Remove the `buildAddRecipientPrompt()` fallback (lines 247-251) — instead, use a hardcoded default template string that matches the new template format
   - Delete `buildAddRecipientPrompt()` function (lines 349-404)

2. **`lib/prompt-registry.ts`**
   - Update `add_recipient_conversation` defaultPrompt to match the full production prompt (porting the structure from `buildAddRecipientPrompt` into template syntax)
   - Update `templateVariables` to include all new variables

3. **New migration: `supabase/migrations/YYYYMMDD_update_add_recipient_prompt.sql`**
   - Update the active `add_recipient_conversation` prompt version in DB to the new template text

### Phase 2: Surface production context for gift generation

**Goal**: Show the PM everything that gets sent to the LLM alongside their prompt.

**Files to modify (be-gifted repo):**

4. **`lib/services/gift-generation.ts`**
   - Extract wrapper message construction (lines 141-152) into `buildWrapperMessage(cis, maxResults, avoidSection)`
   - Add optional `returnContext` flag to `GenerateGiftsOptions`
   - When set, include `productionContext: { wrapperMessage, fullInput }` in return value

5. **`app/api/admin/test-generate/route.ts`**
   - Pass `returnContext: true` when calling `generateGiftsForRecipient()`
   - Include `productionContext` in response

6. **`app/api/admin/preview-cis/route.ts`**
   - Add `wrapperPreview` to response showing the wrapper message template with CIS filled in

**Files to modify (begifted-native repo):**

7. **`hooks/use-prompt-playground.ts`**
   - Store `productionContext` from test-generate responses
   - Expose wrapper preview from CIS preview query

8. **`app/admin/playground.tsx`**
   - Add collapsible "Production Context" card below prompt editor (gift_generation_system only)
   - Shows: wrapper system message, CIS data, avoid section
   - After test: shows the full message array sent to OpenAI

### Phase 3: Add cron simulation mode

**Goal**: Let PM test with the same conditions as the daily cron.

**Files to modify (be-gifted repo):**

9. **`app/api/admin/test-generate/route.ts`**
   - Add optional `simulateCron` flag
   - When true: fetch existing suggestions for recipient, pass as `existingSuggestions`
   - Return cron context: existing suggestion count, avoid list, whether it would retry

**Files to modify (begifted-native repo):**

10. **`hooks/use-prompt-playground.ts` + `app/admin/playground.tsx`**
    - Add "Simulate cron" toggle in gift generation section
    - Display cron context in results

### Phase 4: Show resolved prompts after testing

**Goal**: After testing any conversation prompt, show what was actually sent to the LLM.

11. **`supabase/functions/recipient-conversation/data-extractor.ts`**
    - Add `resolvedSystemPrompt` to `handleConversation()` return value
    - When readiness is "ready" (deterministic return), include a note that the prompt was skipped

12. **`app/admin/playground.tsx`**
    - Add collapsible "Resolved Prompt" card after testing conversation prompts
    - For "ready" state: show notice that deterministic wrap-up was used, prompt was not sent to LLM

### Phase 5: Sync fallback defaults

13. **`lib/prompt-registry.ts`**
    - Verify `gift_generation_system` default is byte-for-byte identical to `be-gifted/lib/prompts/beGiftedProtocolV1.ts`
    - Verify `occasion_recommendations` and `user_preferences_extraction` defaults match their edge function fallbacks
    - Fix any discrepancies

---

## Sequencing

1. **Phase 1** first — biggest behavioral gap, riskiest change
2. **Phase 5** — quick sync fix, no dependencies
3. **Phase 2 + Phase 4** in parallel — additive UI features
4. **Phase 3** after Phase 2 — depends on test-generate endpoint changes

**Cross-repo coordination:** Phase 2 and 3 require deploying `be-gifted` API changes before or simultaneously with `begifted-native` UI changes.

---

## Verification

- **Phase 1**: Test add-recipient flow in playground for each readiness state (not_captured, captured_needs_both, captured_needs_occasion, captured_needs_specificity, ready). Verify the resolved prompt matches what `buildAddRecipientPrompt` would have produced.
- **Phase 2**: In playground, select a recipient and verify the production context card shows the wrapper message with correct CIS. Run a test generation and verify the full input array is displayed.
- **Phase 3**: Toggle "Simulate cron" with a recipient that has existing suggestions. Verify the avoid list appears and results differ from non-cron mode.
- **Phase 4**: Test add_recipient_conversation and verify the resolved prompt card shows all template variables replaced. Test a "ready" state conversation and verify the deterministic skip notice appears.
- **Phase 5**: Diff the default prompts against their source-of-truth locations.
