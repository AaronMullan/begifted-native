import { replayActiveBand, type BandRow } from "../gift-band";

/** Rows are written oldest-first for readability; the replay sorts by time. */
const row = (id: string, generatedAt: string, removedAt?: string): BandRow => ({
  id,
  generated_at: `2026-09-01T00:${generatedAt}:00Z`,
  removedAt: removedAt ? `2026-09-01T00:${removedAt}:00Z` : null,
});

const band = (rows: BandRow[]) => [...replayActiveBand(rows).active].sort();
const peak = (rows: BandRow[]) => replayActiveBand(rows).peak;
/** Slots a removal emptied and nothing has refilled. */
const pending = (rows: BandRow[]) => {
  const { active, peak: p } = replayActiveBand(rows);
  return Math.max(0, p - active.size);
};

describe("replayActiveBand", () => {
  it("keeps the newest three and pushes the rest into past gifts", () => {
    const rows = [
      row("p1", "01"),
      row("p0", "02"),
      row("a2", "03"),
      row("a1", "04"),
      row("a0", "05"),
    ];
    expect(band(rows)).toEqual(["a0", "a1", "a2"]);
  });

  it("leaves the slot of a removed active card empty rather than promoting a past gift", () => {
    // The reported bug: removing an active card used to slide the newest past
    // gift up into the band, so the user was shown an idea they had already
    // passed (DEV-488).
    const rows = [
      row("p1", "01"),
      row("p0", "02"),
      row("a2", "03"),
      row("a1", "04", "06"),
      row("a0", "05"),
    ];
    expect(band(rows)).toEqual(["a0", "a2"]);
    expect(band(rows)).not.toContain("p0");
  });

  it("fills the freed slot with a row generated after the removal", () => {
    const rows = [
      row("p0", "02"),
      row("a2", "03"),
      row("a1", "04", "06"),
      row("a0", "05"),
      row("fresh", "07"),
    ];
    expect(band(rows)).toEqual(["a0", "a2", "fresh"]);
  });

  it("does not free an active slot when a past gift is removed", () => {
    const rows = [
      row("p0", "02", "06"),
      row("a2", "03"),
      row("a1", "04"),
      row("a0", "05"),
    ];
    expect(band(rows)).toEqual(["a0", "a1", "a2"]);
  });

  it("does not leak a pending slot when an old removal was already replaced", () => {
    // Removal at :06 was answered by `n1` at :07, which the user then removed
    // and `n2` answered. Counting removals without replaying would report a
    // deficit here and generate a fourth card.
    const rows = [
      row("p0", "02"),
      row("a2", "03"),
      row("a1", "04", "06"),
      row("a0", "05"),
      row("n1", "07", "08"),
      row("n2", "09"),
    ];
    expect(band(rows)).toEqual(["a0", "a2", "n2"]);
  });

  it("holds every emptied slot when several active cards are removed", () => {
    const rows = [
      row("p0", "02"),
      row("a2", "03"),
      row("a1", "04", "06"),
      row("a0", "05", "07"),
    ];
    expect(band(rows)).toEqual(["a2"]);
  });

  it("never re-admits a past gift once a full run has displaced it", () => {
    const rows = [
      row("a2", "03"),
      row("a1", "04"),
      row("a0", "05"),
      row("b2", "10"),
      row("b1", "11"),
      row("b0", "12", "13"),
    ];
    // b0's slot stays empty; the displaced a-run does not come back.
    expect(band(rows)).toEqual(["b1", "b2"]);
  });

  it("places a row before a removal recorded at the same instant", () => {
    const rows = [row("a0", "05"), row("a1", "05", "05")];
    expect(band(rows)).toEqual(["a0"]);
  });

  it("returns an empty band for a recipient with no rows", () => {
    expect(band([])).toEqual([]);
    expect(peak([])).toBe(0);
  });

  it("reports a pending slot only where a removal emptied one", () => {
    const full = [row("a2", "03"), row("a1", "04"), row("a0", "05")];
    expect(pending(full)).toBe(0);

    // One idea in the run came back unpriced, so the scope only ever held two.
    // That is not a gap: nothing will ever generate against it.
    const neverFull = [row("a1", "04"), row("a0", "05")];
    expect(pending(neverFull)).toBe(0);
    expect(peak(neverFull)).toBe(2);

    const removed = [row("a2", "03"), row("a1", "04", "06"), row("a0", "05")];
    expect(pending(removed)).toBe(1);
  });

  it("keeps a removed row out of the band even if its removal predates it", () => {
    // Clock skew between the two writers must not resurrect a rejected gift as
    // a live recommendation.
    const rows = [row("a2", "03"), row("a1", "04", "01"), row("a0", "05")];
    expect(band(rows)).toEqual(["a0", "a2"]);
  });

  it("is deterministic when a batch insert gives several rows one timestamp", () => {
    // Postgres stamps every row of one insert with the same now(), and 50
    // recipient/timestamp groups in production carry 4-5 such rows. Sort
    // stability alone would let the surviving three vary between refetches.
    const tied = [
      row("id-a", "05"),
      row("id-b", "05"),
      row("id-c", "05"),
      row("id-d", "05"),
      row("id-e", "05"),
    ];
    const first = band(tied);
    expect(first).toHaveLength(3);
    expect(band([...tied].reverse())).toEqual(first);
    expect(band([tied[2], tied[0], tied[4], tied[1], tied[3]])).toEqual(first);
  });
});
