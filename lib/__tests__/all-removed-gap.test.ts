import { fetchGiftSuggestions } from "../api/gifts";
import { partitionSuggestions } from "../../components/gifts/partition";

const mockQuery = (data: unknown[]) => {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "not", "gt", "order", "in"]) {
    builder[m] = () => builder;
  }
  builder.then = (resolve: (v: unknown) => void) =>
    resolve({ data, error: null });
  return builder;
};

// Three ideas for one occasion, every one of them removed a minute ago.
jest.mock("../supabase", () => ({
  supabase: {
    from: (table: string) =>
      mockQuery(
        table === "gift_suggestions"
          ? ["a", "b", "c"].map((id) => ({
              id,
              recipient_id: "r1",
              occasion_id: "o1",
              generated_at: "2026-10-16T11:00:00.000Z",
              price: 50,
            }))
          : ["a", "b", "c"].map((id) => ({
              gift_suggestion_id: id,
              created_at: "2026-10-16T11:59:00.000Z",
            }))
      ),
  },
}));

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-16T12:00:00Z"));
});

test.each([
  ["recipient", null, "r1"],
  ["occasion", "o1", "r1:o1"],
])(
  "a %s list whose every idea was removed still holds three pending slots",
  async (_label, occasionId, scope) => {
    const { suggestions, scopes } = await fetchGiftSuggestions("r1");
    expect(suggestions).toHaveLength(0);

    const { visible, pendingSlots, pendingStalled } = partitionSuggestions(
      suggestions,
      occasionId,
      scopes[scope]
    );
    expect(visible).toHaveLength(0);
    expect(pendingSlots).toBe(3);
    expect(pendingStalled).toBe(false);
  }
);
