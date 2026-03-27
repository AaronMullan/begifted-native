# Open-Ended Preferences Redesign

Replace rigid enum-based gifting preferences with a single free-text summary.

## Problem

The system extracted 5 preference fields into rigid enums via the `extract-user-preferences` edge function. The enums were too restrictive — users describe themselves in ways that don't map cleanly (e.g., "agnostic" philosophy). The enum values weren't surfaced in any UI and had no active downstream consumer, so there was no reason to constrain them.

## What Changed

Removed `user_stack` (jsonb with 4 enum fields) and `default_gifting_tone` (text enum) from `user_preferences`. Replaced with `gifting_summary` — a single free-text string (2-4 sentences) that captures the user's gifting style in their own words.

The edge function no longer forces LLM output into enums. Instead it asks the LLM to produce a concise summary preserving the user's voice. No `clampToValid()`, no enum arrays.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/extract-user-preferences/index.ts` | Removed enum arrays and `clampToValid()`, new free-text prompt, returns `{ gifting_summary }` |
| `lib/api.ts` | `UserPreferences.gifting_summary: string \| null` replaces `user_stack` and `default_gifting_tone` |
| `lib/prompt-registry.ts` | Updated `user_preferences_extraction` default prompt |
| `supabase/functions/refine-prompt/index.ts` | Updated category guidance |
| `supabase/functions/types.ts` | Removed `PhilosophyType`/`CreativityType`/`BudgetStyleType`/`PlanningStyleType` unions, `UserPreferences`, `UserStack`; simplified `UserData` |
| `app/(tabs)/settings/gifting.tsx` | `handleSave()` stores `gifting_summary` |
| `supabase/migrations/20260327_open_ended_preferences.sql` | Adds `gifting_summary` column, drops `user_stack` and `default_gifting_tone` |

## Notes

- Existing users won't have a `gifting_summary` until they re-save preferences. Their raw `gifting_style_text` (or `user_description` from onboarding) is still intact.
- No backfill script — `gifting_summary` has no active consumer yet, so null values are fine.
- Onboarding (`app/onboarding/identity.tsx`) unchanged — it only writes `user_description`.
