# Gift Occasion Suggestions — Non-Prompt Pipeline Audit (DEV-140)

_Last updated: 2026-06-09. Scope: the non-prompt implementation pipeline behind "Gift Occasion Suggestions," prompted by Caspian's 2026-06-08 Slack thread in #design. The prompt itself (active `occasion_recommendations` **v6**) is excellent and out of scope — this audit covers everything around it: what context actually reaches the model, how the response is parsed, and what the frontend renders._

## TL;DR

The v6 prompt is well-built and aggressively suppresses generic holidays. **Caspian's instinct is correct: the remaining issues are in the pipeline, not the prompt.** The model is _not_ receiving the full recipient context the prompt is written for, a known-but-undated occasion can be silently dropped before display, and the error-path fallback re-injects exactly the generic holidays the prompt is designed to avoid. The playground test harness also can't supply three of the prompt's input fields, so the audit's own test cases can't fully exercise the prompt.

## The full chain (traced)

```
OccasionsSelectionView (add-recipient flow)
  → useOccasionRecommendations            hooks/use-occasion-recommendations.ts
    → supabase.functions.invoke("recipient-conversation", { action: "recommend_occasions" })
      → recommendOccasions(...)            supabase/functions/recipient-conversation/data-extractor.ts
        → loadActivePrompt("occasion_recommendations")   ← active DB prompt v6
        → callAI(openai, gpt-5.4-mini)     supabase/functions/_shared/ai-client.ts
        → parse → coerce → return
  → mapRecommendationsToOccasions(...)     → merge with conversation occasions → render
```

Two fallback layers wrap this: a **server** fallback (`getFallbackOccasionRecommendations`) when the AI call throws or JSON parsing fails, and a **client** fallback (`getFallbackRecommendations`) when the edge function errors or returns a non-array.

## Findings by audit area

Legend: ✅ works as intended · ⚠️ partial / conditional · 🔴 broken or dead in production.

### 1. Raw prompt input — ⚠️

The active v6 prompt declares 10 input placeholders: `today, name, relationship, birthday, knownRoles, householdContext, importantDates, knownOccasions, culturalContext, interests`. What the production add-recipient flow actually populates:

| Field                                           | Populated?         | Source                                                                                          |
| ----------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| `name`, `relationship`, `birthday`, `interests` | ✅                 | conversation extraction (`ExtractedData`)                                                       |
| `knownRoles`                                    | ✅                 | extraction, **or** server `inferRolesFromRelationship` fallback (parent/grandparent vocab only) |
| `householdContext`                              | ✅ (when surfaced) | conversation extraction                                                                         |
| `knownOccasions`                                | ✅                 | server derives from already-tracked occasions                                                   |
| `importantDates`                                | ⚠️                 | client-derived **only** from anniversary occasions already saved with a full ISO date           |
| `culturalContext`                               | 🔴                 | **never populated** — not in the extractor schema, never passed                                 |

So the answer to Caspian's headline question — _"is the model getting full recipient context, or only name + birthday + basic relationship?"_ — is: it gets a bit more than that (interests, roles, household when the conversation surfaced them), but **`culturalContext` is always empty and `importantDates` is usually empty**, and there is no CIS/synthesized-profile input at all (see area 5). → **DEV-156**, **DEV-155**.

### 2. Relationship normalization — ⚠️

`relationship_type` is passed to the prompt **raw** — there is no normalization step mapping wife/spouse/partner, mom/mother, dad/father, son/daughter/child, etc. to a canonical form. The only relationship-derived processing is `inferRolesFromRelationship`, which maps explicit parent/grandparent words to `knownRoles` (so "wife" alone does _not_ unlock the mother role — by design, matching the extractor's no-inference rule).

Worse, `useOccasionRecommendations` **bails entirely** when `relationship_type` is empty/null (`if (!extractedData?.relationship_type) { setRecommendations(null); return; }`) — no AI call at all. This is exactly Michelle's pre-fix `relationship: null` case: it produced **zero** AI occasions, not merely weaker ones. → **DEV-160**.

### 3. Important dates / `suggestedDate` display — 🔴

Two distinct gaps:

- **Input:** `importantDates` only carries anniversary occasions already stored with a year-bearing ISO date (`deriveImportantDates`). A recipient's anniversary stored elsewhere never reaches the prompt (area 1).
- **Output (the visible bug):** `mapRecommendationsToOccasions` returns `null` for any primary occasion whose date can't be resolved. A `relationship_based_occasion` with `suggestedDate: null` — which v6 **explicitly allows** for a known-but-undated anniversary — is therefore **discarded and never shown**. This is precisely Caspian's "model suggested Wedding anniversary, but no date displayed": the model returned it, the client dropped it. Frontend output does not match parsed model JSON. → **DEV-157**.

### 4. Household / parent-role context — ⚠️

The plumbing exists and is correct: `knownRoles` + `householdContext` flow into the prompt, and v6 prioritizes Mother's/Father's Day for a spouse-who-is-a-parent. The dependency is entirely on **conversation extraction** having captured those signals. For "Michelle = wife + mother of my kids" to surface Mother's Day, the conversation must have made parenthood explicit (the extractor deliberately won't infer it from "wife"). No pipeline bug here — it's gated on extraction quality and on the data actually being present. Covered indirectly by **DEV-156**.

### 5. Interests / CIS context — 🔴

`interests` (a plain string array from the conversation) does reach `{{interests}}`. But the v6 prompt repeatedly references **CIS** and **`synthesized_profile`** as a primary lens — and the pipeline **never passes any CIS or synthesized recipient profile**. The recommendation runs at add-time off the conversation `ExtractedData`, not the stored/synthesized recipient profile. So for a rich recipient like Atticus, the deeper signal the prompt is written to use simply isn't there → safe, generic birthday + Christmas. → **DEV-155**.

### 6. `additionalSuggestions` source — ⚠️

In the happy path, the chips come straight from the model's `additionalSuggestions` JSON (`OccasionsSelectionView` reads `recommendations.additionalSuggestions`). **But** both fallback layers hardcode `["Christmas", "New Year", "Thanksgiving"]`. So whenever the AI call fails, the user sees exactly the generic holidays v6's generic-holiday filter exists to suppress — sourced from app fallback logic, not the model. This is the most likely explanation for "Christmas/Thanksgiving still appearing too easily." → **DEV-158**.

### 7. Schema / fallback behavior — ⚠️

- **Model:** `gpt-5.4-mini` (a `gpt-5*` reasoning model). The caller passes `maxTokens: 900`, but this is **harmless** — `ai-client.ts` floors reasoning models to `max_completion_tokens: 4000` and sets `reasoning_effort: "low"`. So the "tight budget → empty content" trap documented in CLAUDE.md does _not_ apply here.
- **Parsing:** the server doesn't do strict schema validation — it coerces fields defensively. The server fallback fires only on AI throw or `parseOpenAIJSON` throw; the client fallback fires on edge-function error or a non-array `primaryOccasions`. An empty `primaryOccasions: []` (which v6 permits) does **not** trigger a false fallback. ✅
- **The gap is the fallback _content_**, not when it fires (area 6 / **DEV-158**).

Additional harness gap: the playground's `occasion_recommendations` entry in `lib/prompt-registry.ts` lists only 7 of the 10 `templateVariables` (missing `importantDates`, `knownOccasions`, `culturalContext`) and ships the stale v1 `defaultPrompt`. So the playground — the test harness these observations came from — **can't supply the very fields under audit**. → **DEV-159**.

## Acceptance criteria — status

| AC                                                                                 | Status | Notes                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Known relationship & role context consistently reaches the prompt                  | ⚠️     | Roles/household reach it _if_ extraction captured them; relationship is un-normalized and a null relationship blocks recs entirely (DEV-160). |
| Known dates (anniversaries) reach the prompt and display when available            | 🔴     | Not reliably passed (DEV-156) and undated primaries are dropped before display (DEV-157).                                                     |
| `additionalSuggestions` not filled with generic holidays unless model-justified    | 🔴     | Happy path ✅; error-path fallback injects generic holidays (DEV-158).                                                                        |
| Frontend output matches parsed model JSON, not a fallback set (unless model fails) | 🔴     | Undated primary occasions dropped (DEV-157); fallback set is generic holidays (DEV-158).                                                      |
| Rich profiles produce recipient-aware suggestions beyond birthday + Christmas      | 🔴     | CIS/synthesized profile never reaches the prompt (DEV-155).                                                                                   |

## Follow-up tickets

| Ticket                                                    | Issue                                                                | Area    |
| --------------------------------------------------------- | -------------------------------------------------------------------- | ------- |
| [DEV-155](https://be-gifted.atlassian.net/browse/DEV-155) | Occasion recs don't receive recipient CIS / synthesized profile      | 5       |
| [DEV-156](https://be-gifted.atlassian.net/browse/DEV-156) | `culturalContext` & `importantDates` never populated                 | 1, 3, 4 |
| [DEV-157](https://be-gifted.atlassian.net/browse/DEV-157) | Undated primary occasions silently dropped before display            | 3       |
| [DEV-158](https://be-gifted.atlassian.net/browse/DEV-158) | Error-path fallback reintroduces generic holidays                    | 6, 7    |
| [DEV-159](https://be-gifted.atlassian.net/browse/DEV-159) | Playground can't test full occasion prompt (missing template vars)   | 1, 7    |
| [DEV-160](https://be-gifted.atlassian.net/browse/DEV-160) | `relationship_type` not normalized; missing relationship → zero recs | 2       |

## Suggested sequencing

1. **DEV-159** first — without the missing playground variables, none of the rich-context fixes can be verified.
2. **DEV-158** — small, high-value: stop fallback from injecting generic holidays.
3. **DEV-157** — small frontend fix so undated occasions (anniversaries) actually display.
4. **DEV-155 / DEV-156** — the substantive context-plumbing work (CIS/profile + cultural/date capture); biggest quality lever for rich recipients.
5. **DEV-160** — relationship normalization + don't hard-bail on missing relationship.
