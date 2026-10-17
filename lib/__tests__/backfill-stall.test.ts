import {
  BACKFILL_MAX_MS,
  fetchGiftSuggestions,
  triggerGiftBackfill,
} from "../api/gifts";

const now = Date.parse("2026-10-16T12:00:00Z");

/** A supabase query builder whose every filter returns itself and which
 * resolves to `data` when awaited. */
const mockQuery = (data: unknown[]) => {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "not", "gt", "order", "in"]) {
    builder[m] = () => builder;
  }
  builder.then = (resolve: (v: unknown) => void) =>
    resolve({ data, error: null });
  return builder;
};

// Three ideas, one removed three days ago: a gap whose backfill never landed.
jest.mock("../supabase", () => ({
  supabase: {
    from: (table: string) =>
      mockQuery(
        table === "gift_suggestions"
          ? ["a", "b", "c"].map((id) => ({
              id,
              recipient_id: "r1",
              occasion_id: "o1",
              generated_at: "2026-10-06T12:00:00.000Z",
              price: 50,
            }))
          : [
              {
                gift_suggestion_id: "a",
                created_at: "2026-10-13T12:00:00.000Z",
              },
            ]
      ),
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "t" } },
      }),
    },
  },
}));

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(now);
  globalThis.fetch = jest.fn(async () => ({
    ok: true,
  })) as unknown as typeof fetch;
});

test("a retried backfill restarts the stall clock on an old gap", async () => {
  const before = await fetchGiftSuggestions("r1");
  expect(before.scopes["r1:o1"].stalled).toBe(true);

  await triggerGiftBackfill("r1", "o1");
  const during = await fetchGiftSuggestions("r1");
  expect(during.scopes["r1:o1"].stalled).toBe(false);
  // A retry on one occasion's list leaves the recipient-wide verdict alone.
  expect(during.scopes["r1"].stalled).toBe(true);

  jest.spyOn(Date, "now").mockReturnValue(now + BACKFILL_MAX_MS + 1);
  const after = await fetchGiftSuggestions("r1");
  expect(after.scopes["r1:o1"].stalled).toBe(true);
});
