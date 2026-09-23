import type { GiftSuggestion } from "../../types/recipient";
import { ACTIVE_COUNT } from "../../lib/gift-band";

export { ACTIVE_COUNT };

/** Splits suggestions (newest-first, as the api returns them) into the active
 * recommendation cards and the older "Past Gifts", plus the count of active
 * slots standing empty because a removed card has not been replaced yet.
 *
 * Band membership is decided in `fetchGiftSuggestions` by replaying the
 * generate/remove timeline, not by list position — see `lib/gift-band.ts`.
 * Each row carries a flag per scope because the two views band differently: a
 * recipient's newest three overall are not the newest three within one
 * occasion. */
export function partitionSuggestions(
  suggestions: GiftSuggestion[],
  occasionId?: string | null
) {
  const visible = occasionId
    ? suggestions.filter((s) => s.occasion_id === occasionId)
    : suggestions;

  const isActive = (s: GiftSuggestion) =>
    occasionId ? s.active_in_occasion : s.active_in_recipient;

  const active = visible.filter(isActive);

  return {
    visible,
    active,
    past: visible.filter((s) => !isActive(s)),
    // A gap here means a removed card is awaiting its replacement, which is
    // what the backfill generates against (DEV-488).
    pendingSlots: Math.max(0, ACTIVE_COUNT - active.length),
  };
}
