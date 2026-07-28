import { getNextUpcomingOccasion } from "../upcoming-occasion";
import type { Occasion } from "../../lib/api";

// Pin the clock (July 8, 2026) so "next occurrence" is deterministic.
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 6, 8));
});

afterEach(() => {
  jest.useRealTimers();
});

const occasion = (overrides: Partial<Occasion>): Occasion => ({
  id: "o1",
  date: null,
  occasion_type: "custom",
  recipient_id: "r1",
  is_annual: true,
  ...overrides,
});

describe("getNextUpcomingOccasion", () => {
  it("resolves floating holidays from the rule, not the stored month/day", () => {
    // Stored at its 2026 date (May 10), which has passed; Mother's Day 2027
    // is May 9 — rolling the stored month/day would wrongly give May 10.
    const next = getNextUpcomingOccasion(undefined, [
      occasion({ occasion_type: "mothers_day", date: "2026-05-10" }),
    ]);
    expect(next).toEqual({ occasionType: "mothers_day", date: "2027-05-09" });
  });

  it("rolls unknown annual occasions forward by stored month/day", () => {
    const next = getNextUpcomingOccasion(undefined, [
      occasion({ occasion_type: "anniversary", date: "2001-09-22" }),
    ]);
    expect(next).toEqual({ occasionType: "anniversary", date: "2026-09-22" });
  });

  it("picks the soonest among birthday and occasions", () => {
    const next = getNextUpcomingOccasion("1990-08-01", [
      occasion({ occasion_type: "christmas", date: "2026-12-25" }),
    ]);
    expect(next).toEqual({ occasionType: "birthday", date: "2026-08-01" });
  });

  it("skips past one-time occasions and undated occasions", () => {
    const next = getNextUpcomingOccasion(undefined, [
      occasion({
        occasion_type: "graduation",
        date: "2026-05-15",
        is_annual: false,
      }),
      occasion({ occasion_type: "new_job", date: null }),
    ]);
    expect(next).toBeNull();
  });
});
