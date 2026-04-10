# Prompt Playground Alignment — Deploy Plan

## Status

All code changes are complete across both repos.

- `begifted-native` branch: `feature/prompt-playground-alignment`
- `be-gifted`: Phases 2/3 API changes applied to main

## Deploy Sequence

### Step 1: Deploy `be-gifted` API (Vercel)

Push/merge the Phase 2/3 changes. The new response fields (`productionContext`, `cronContext`, `wrapperPreview`) are additive and backward-compatible.

### Step 2: Run the Supabase migration

```bash
supabase migration up
# or: supabase db push
```

This runs `20260410_update_add_recipient_prompt.sql`, which deactivates the v1 `add_recipient_conversation` prompt and inserts v2 with readiness-state template variables.

### Step 3: Deploy the edge function

```bash
supabase functions deploy recipient-conversation
```

The updated `data-extractor.ts` now uses `interpolatePrompt()` for all template variables and falls back to `ADD_RECIPIENT_DEFAULT_TEMPLATE` if no DB prompt exists.

### Step 4: Deploy `begifted-native`

Ship via `eas update` (OTA) or a new build. This includes:
- Updated prompt registry default (Phase 1)
- Resolved Prompt card in conversation results (Phase 4)
- Production Context card in gift generation results (Phase 2d)
- Simulate Cron toggle + Cron Context card (Phase 3b)
- Fixed `occasion_recommendations` template variables (Phase 5)

## Post-Deploy Verification

1. **Phase 1**: Open playground, select `add_recipient_conversation`. Test conversations that hit each readiness state:
   - `not_captured` — fresh conversation
   - `captured_needs_both` — provide name + relationship only
   - `captured_needs_occasion` — provide name, relationship, interests
   - `captured_needs_specificity` — provide name, relationship, occasion
   - `ready` — provide all three anchors

   Confirm the resolved prompt (Phase 4 card) shows the correct state-specific guidance and priority order for each.

2. **Phase 2**: Select `gift_generation_system`, pick a recipient, run a test. Confirm the Production Context card shows the wrapper message and full input array.

3. **Phase 3**: Enable "Simulate Cron" toggle for a recipient with existing suggestions. Confirm the Cron Context card shows the avoid list and existing suggestion count.

4. **Phase 4**: After testing a conversation that reaches "ready" state, confirm the Resolved Prompt card says "deterministic wrap-up was used."

5. **Phase 5**: Verify `occasion_recommendations` test doesn't produce doubled `- Birthday: - Birthday:` prefixes.
