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
export function replayActiveBand(rows: BandRow[]): Set<string> {
  // Every generation and removal as one chronological stream. A removal sorts
  // after a generation at the same instant so a row is never removed before it
  // has been placed.
  const events: { at: string; add: string | null; remove: string | null }[] = [
    ...rows.map((r) => ({ at: r.generated_at, add: r.id, remove: null })),
    ...rows
      .filter((r) => r.removedAt !== null)
      .map((r) => ({ at: r.removedAt as string, add: null, remove: r.id })),
  ].sort((a, b) =>
    a.at === b.at
      ? Number(a.add === null) - Number(b.add === null)
      : a.at < b.at
        ? -1
        : 1
  );

  // Newest-first, capped at ACTIVE_COUNT. Rows pushed off the end are past and
  // never re-enter.
  let band: string[] = [];
  for (const event of events) {
    if (event.add !== null) {
      band = [event.add, ...band].slice(0, ACTIVE_COUNT);
    } else {
      band = band.filter((id) => id !== event.remove);
    }
  }
  return new Set(band);
}
