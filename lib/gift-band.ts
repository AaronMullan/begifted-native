/**
 * Which gift suggestions hold an active recommendation slot, and which have
 * been displaced into "Past Gifts".
 */

/** How many recommendation cards the active band holds. Anything displaced by
 * newer ideas falls into the "Past Gifts" drawer (DEV-165). */
export const ACTIVE_COUNT = 3;

/** One row's place in the recipient's history, as the replay needs to see it.
 * `removedAt` is the timestamp of the feedback that hid the row, or null while
 * it is still on screen. */
export type BandRow = {
  id: string;
  generated_at: string;
  removedAt: string | null;
};

export type Band = {
  /** Ids currently holding an active slot. */
  active: Set<string>;
  /** The most slots this scope ever held at once. The shortfall against
   * `active` is what a removal emptied, which is the only gap worth generating
   * against — a scope that never reached three (one unpriced row in the run,
   * a recipient still mid-generation) has no gap at all. */
  peak: number;
};

/**
 * Replays the generate/remove timeline to decide which rows currently hold an
 * active slot.
 *
 * List position cannot answer this. The active band used to be `slice(0, 3)`
 * of the visible rows, so removing an active card shifted every older row up
 * and the newest Past Gift silently became a current recommendation — a gift
 * the user had already scrolled past, presented as freshly picked (DEV-488).
 *
 * Replaying separates the two cases position conflates. A row enters the band
 * when it is generated and leaves only when a newer row pushes it out or the
 * user removes it; a slot emptied by a removal stays empty until a row
 * generated *after* that removal fills it. So past rows are never promoted,
 * and the gap survives as a deficit the backfill can generate against.
 *
 * Callers pass one scope at a time — a whole recipient, or a single occasion —
 * and must include rows hidden by removal feedback: those held slots too, and
 * dropping them makes the replay promote past rows all over again.
 */
export function replayActiveBand(rows: BandRow[]): Band {
  // Every generation and removal as one chronological stream. A removal sorts
  // after a generation at the same instant so a row is never removed before it
  // has been placed; id breaks the remaining ties because a batch insert gives
  // every row in it one `now()` — without it the surviving three would depend
  // on sort stability and could differ between refetches.
  const events: { at: string; id: string; add: boolean }[] = [
    ...rows.map((r) => ({ at: r.generated_at, id: r.id, add: true })),
    ...rows
      .filter((r) => r.removedAt !== null)
      // Never earlier than the row itself: a removal stamped before its own
      // gift (clock skew on either writer) would otherwise land as a no-op and
      // leave the row sitting in the band as a live recommendation.
      .map((r) => ({
        at: r.removedAt! < r.generated_at ? r.generated_at : r.removedAt!,
        id: r.id,
        add: false,
      })),
  ].sort(
    (a, b) =>
      a.at.localeCompare(b.at) ||
      Number(b.add) - Number(a.add) ||
      a.id.localeCompare(b.id)
  );

  // Newest-first, capped at ACTIVE_COUNT. Rows pushed off the end are past and
  // never re-enter.
  let band: string[] = [];
  let peak = 0;
  for (const event of events) {
    if (event.add) {
      band = [event.id, ...band].slice(0, ACTIVE_COUNT);
      peak = Math.max(peak, band.length);
    } else {
      band = band.filter((id) => id !== event.id);
    }
  }
  return { active: new Set(band), peak };
}
