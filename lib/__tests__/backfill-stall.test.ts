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
  respondWith({ ok: true, body: {} });
});

const respondWith = ({ ok, body }: { ok: boolean; body: unknown }) => {
  globalThis.fetch = jest.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  })) as unknown as typeof fetch;
};

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

test("a backfill request that starts no run reads as stalled at once", async () => {
  for (const fail of [
    () => {
      // A browser blocking the request rejects the fetch itself.
      globalThis.fetch = jest.fn(async () => {
        throw new TypeError("Failed to fetch");
      }) as unknown as typeof fetch;
    },
    () => respondWith({ ok: false, body: {} }),
    () =>
      respondWith({ ok: true, body: { skipped: "recommendations_disabled" } }),
  ]) {
    fail();
    expect(await triggerGiftBackfill("r1", "o1")).toBe(false);
    const after = await fetchGiftSuggestions("r1");
    expect(after.scopes["r1:o1"].stalled).toBe(true);
  }
});

test("a later request that starts a run clears the failure", async () => {
  respondWith({ ok: false, body: {} });
  await triggerGiftBackfill("r1", "o1");

  respondWith({ ok: true, body: { skipped: "in_flight" } });
  expect(await triggerGiftBackfill("r1", "o1")).toBe(true);
  const after = await fetchGiftSuggestions("r1");
  expect(after.scopes["r1:o1"].stalled).toBe(false);
});

test("a failed request doesn't stall a gap emptied after it", async () => {
  const removedAt = Date.parse("2026-10-13T12:00:00.000Z");
  jest.spyOn(Date, "now").mockReturnValue(removedAt - 60_000);
  respondWith({ ok: false, body: {} });
  await triggerGiftBackfill("r1", "o1");

  jest.spyOn(Date, "now").mockReturnValue(removedAt + 60_000);
  const after = await fetchGiftSuggestions("r1");
  expect(after.scopes["r1:o1"].stalled).toBe(false);
});

test("an older request failing late doesn't cover a newer one", async () => {
  let rejectOlder: (err: Error) => void = () => {};
  globalThis.fetch = jest.fn(
    () =>
      new Promise((_resolve, reject) => {
        rejectOlder = reject;
      })
  ) as unknown as typeof fetch;
  const older = triggerGiftBackfill("r1", "o1");
  // Let the older request reach fetch before the newer one replaces the mock.
  await new Promise((r) => setTimeout(r, 0));

  jest.spyOn(Date, "now").mockReturnValue(now + 1);
  respondWith({ ok: true, body: { queued: true } });
  expect(await triggerGiftBackfill("r1", "o1")).toBe(true);

  rejectOlder(new TypeError("Failed to fetch"));
  expect(await older).toBe(false);
  const after = await fetchGiftSuggestions("r1");
  expect(after.scopes["r1:o1"].stalled).toBe(false);
});
