import {
  GENERATION_STALE_MS,
  canRequestGiftIdeas,
  giftIdeasEmptyState,
  pickStateOccasion,
} from "../gift-ideas-state";

// Local noon, so date math never straddles midnight.
const NOW = new Date(2026, 8, 24, 12).getTime();

const occasion = (overrides: Record<string, unknown> = {}) => ({
  date: "2026-10-01", // 7 days out
  is_annual: false,
  last_generation_status: null,
  generation_started_at: null,
  fulfilled_at: null,
  ...overrides,
});

const state = (
  occ: ReturnType<typeof occasion> | null,
  overrides: Partial<Parameters<typeof giftIdeasEmptyState>[0]> = {}
) =>
  giftIdeasEmptyState({
    occasion: occ,
    leadDays: 21,
    remindersEnabled: true,
    clientGenerating: false,
    loadFailed: false,
    now: NOW,
    ...overrides,
  });

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});
afterEach(() => {
  jest.useRealTimers();
});

describe("giftIdeasEmptyState", () => {
  it("reads a fresh start stamp as generating", () => {
    const started = new Date(NOW - 60_000).toISOString();
    expect(state(occasion({ generation_started_at: started }))).toBe(
      "generating"
    );
  });

  it("reads a stale start stamp as failed", () => {
    const started = new Date(NOW - GENERATION_STALE_MS - 1).toISOString();
    expect(state(occasion({ generation_started_at: started }))).toBe("failed");
  });

  it("lets a run in flight win over the previous run's outcome", () => {
    const started = new Date(NOW - 60_000).toISOString();
    expect(
      state(
        occasion({
          generation_started_at: started,
          last_generation_status: "error",
        })
      )
    ).toBe("generating");
  });

  it("maps recorded outcomes", () => {
    expect(state(occasion({ last_generation_status: "error" }))).toBe("failed");
    expect(state(occasion({ last_generation_status: "no_results" }))).toBe(
      "no_results"
    );
  });

  it("reads an occasion beyond the lead window as not due", () => {
    expect(state(occasion({ date: "2026-12-01" }))).toBe("not_due");
  });

  it("ignores last cycle's outcome on an annual row not yet re-dated", () => {
    for (const last_generation_status of ["no_results", "error", "success"]) {
      expect(
        state(
          occasion({
            date: "2025-12-01",
            is_annual: true,
            last_generation_status,
          })
        )
      ).toBe("not_due");
    }
    expect(
      state(
        occasion({
          date: "2025-12-01",
          is_annual: true,
          fulfilled_at: "2025-11-20T00:00:00Z",
        })
      )
    ).toBe("not_due");
  });

  it("stops reading an abandoned stamp as failed after a day", () => {
    const started = new Date(NOW - 25 * 60 * 60 * 1000).toISOString();
    expect(
      state(occasion({ date: "2026-12-01", generation_started_at: started }))
    ).toBe("not_due");
  });

  it("uses the next occurrence of a past annual date", () => {
    expect(state(occasion({ date: "2020-12-01", is_annual: true }))).toBe(
      "not_due"
    );
    expect(state(occasion({ date: "2020-10-01", is_annual: true }))).toBe(
      "scheduled"
    );
  });

  it("reads an in-window occasion with no run in flight as scheduled", () => {
    expect(state(occasion())).toBe("scheduled");
  });

  it("is empty when nothing is coming", () => {
    expect(state(occasion({ fulfilled_at: "2026-09-01T00:00:00Z" }))).toBe(
      "empty"
    );
    expect(state(occasion(), { remindersEnabled: false })).toBe("empty");
    expect(state(occasion({ last_generation_status: "success" }))).toBe(
      "empty"
    );
    expect(state(occasion({ date: "2026-09-01" }))).toBe("empty");
    expect(state(occasion({ date: null }))).toBe("empty");
    expect(state(null)).toBe("empty");
  });

  it("puts a failed load and a client-started run first", () => {
    expect(state(occasion({ date: "2026-12-01" }), { loadFailed: true })).toBe(
      "failed"
    );
    expect(
      state(occasion({ date: "2026-12-01" }), { clientGenerating: true })
    ).toBe("generating");
  });
});

describe("pickStateOccasion", () => {
  it("prefers an occasion with a run in flight", () => {
    const running = occasion({
      date: "2026-12-01",
      generation_started_at: new Date(NOW - 1000).toISOString(),
    });
    expect(pickStateOccasion([occasion(), running], NOW)).toBe(running);
  });

  it("otherwise takes the next upcoming occasion", () => {
    const later = occasion({ date: "2026-11-01" });
    const sooner = occasion({ date: "2026-10-01" });
    const past = occasion({ date: "2026-09-01" });
    expect(pickStateOccasion([later, past, sooner], NOW)).toBe(sooner);
    expect(pickStateOccasion([past], NOW)).toBeNull();
  });
});

describe("canRequestGiftIdeas", () => {
  it("asks for an upcoming occasion that has never had a set, whatever the date", () => {
    expect(canRequestGiftIdeas(occasion(), NOW)).toBe(true);
    expect(canRequestGiftIdeas(occasion({ date: "2027-02-14" }), NOW)).toBe(
      true
    );
  });

  it("asks for an annual row still carrying last cycle's outcome", () => {
    expect(
      canRequestGiftIdeas(
        occasion({
          date: "2025-11-13",
          is_annual: true,
          last_generation_status: "success",
        }),
        NOW
      )
    ).toBe(true);
  });

  it("leaves alone a set this cycle already has, a failed or empty run, and a chosen gift", () => {
    for (const status of ["success", "error", "no_results"]) {
      expect(
        canRequestGiftIdeas(occasion({ last_generation_status: status }), NOW)
      ).toBe(false);
    }
    expect(
      canRequestGiftIdeas(
        occasion({ fulfilled_at: new Date(NOW).toISOString() }),
        NOW
      )
    ).toBe(false);
  });

  it("never asks while a run is in flight or its stamp reads as failed", () => {
    const fresh = new Date(NOW - 60_000).toISOString();
    const stale = new Date(NOW - GENERATION_STALE_MS - 1).toISOString();
    expect(
      canRequestGiftIdeas(occasion({ generation_started_at: fresh }), NOW)
    ).toBe(false);
    expect(
      canRequestGiftIdeas(occasion({ generation_started_at: stale }), NOW)
    ).toBe(false);
  });

  it("never asks for a passed one-time occasion, an undated one, or none", () => {
    expect(canRequestGiftIdeas(occasion({ date: "2026-09-01" }), NOW)).toBe(
      false
    );
    expect(canRequestGiftIdeas(occasion({ date: null }), NOW)).toBe(false);
    expect(canRequestGiftIdeas(null, NOW)).toBe(false);
  });
});
