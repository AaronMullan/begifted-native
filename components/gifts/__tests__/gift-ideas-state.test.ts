import {
  GENERATION_STALE_MS,
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
    expect(state(occasion({ date: null }))).toBe("not_due");
  });

  it("uses the next occurrence of a past annual date", () => {
    expect(state(occasion({ date: "2020-12-01", is_annual: true }))).toBe(
      "not_due"
    );
    expect(state(occasion({ date: "2020-10-01", is_annual: true }))).toBe(
      "generating"
    );
  });

  it("reads an in-window occasion with no run yet as generating", () => {
    expect(state(occasion())).toBe("generating");
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
