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

  // Measured against the scope's own high-water mark, not ACTIVE_COUNT: a
  // shortfall is a slot a removal emptied. A scope that never reached three —
  // a run where one idea came back unpriced, a recipient still generating —
  // has no gap, and holding a slot open there would spin forever because only
  // a removal starts a backfill (DEV-488).
  const peak = visible[0]
    ? occasionId
      ? visible[0].peak_in_occasion
      : visible[0].peak_in_recipient
    : 0;

  return {
    visible,
    active,
    past: visible.filter((s) => !isActive(s)),
    pendingSlots: Math.max(0, Math.min(peak, ACTIVE_COUNT) - active.length),
  };
}
