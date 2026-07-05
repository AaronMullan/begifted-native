import type { GiftSuggestion } from "../../types/recipient";

/** How many of the newest suggestions show as active recommendation cards.
 * Anything older falls into the "Past Gifts" drawer (DEV-165). */
export const ACTIVE_COUNT = 3;

/** Splits suggestions (newest-first, as the api returns them) into the active
 * recommendation cards and the older "Past Gifts". When an occasion filter is
 * set, only that occasion's suggestions are considered — so the active card and
 * the drawer stay in sync with what the filtered list shows. */
export function partitionSuggestions(
  suggestions: GiftSuggestion[],
  occasionId?: string | null
) {
  const visible = occasionId
    ? suggestions.filter((s) => s.occasion_id === occasionId)
    : suggestions;
  return {
    visible,
    active: visible.slice(0, ACTIVE_COUNT),
    past: visible.slice(ACTIVE_COUNT),
  };
}
