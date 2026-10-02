import { assertEquals } from "jsr:@std/assert@1";
import { normalizeBudgetRange } from "./budget.ts";

type Budget = Parameters<typeof normalizeBudgetRange>[0];

Deno.test("no-limit answer keeps the flag and leaves the range empty", () => {
  const data: Budget = {
    gift_budget_min: null,
    gift_budget_max: null,
    gift_budget_no_ceiling: true,
  };
  normalizeBudgetRange(data);
  assertEquals(data, {
    gift_budget_min: null,
    gift_budget_max: null,
    gift_budget_no_ceiling: true,
  });
});

Deno.test("a stated minimum survives alongside no ceiling", () => {
  const data: Budget = {
    gift_budget_min: "100",
    gift_budget_max: "null",
    gift_budget_no_ceiling: "true",
  };
  normalizeBudgetRange(data);
  assertEquals(data, {
    gift_budget_min: 100,
    gift_budget_max: null,
    gift_budget_no_ceiling: true,
  });
});

Deno.test("a stated maximum overrides the no-ceiling flag", () => {
  const data: Budget = {
    gift_budget_min: null,
    gift_budget_max: 250,
    gift_budget_no_ceiling: true,
  };
  normalizeBudgetRange(data);
  assertEquals(data.gift_budget_no_ceiling, false);
  assertEquals(data.gift_budget_max, 250);
});

Deno.test("anything but an explicit true is not a no-limit answer", () => {
  for (const flag of [false, null, "false", "null", "yes", 1]) {
    const data: Budget = {
      gift_budget_min: null,
      gift_budget_max: null,
      gift_budget_no_ceiling: flag,
    };
    normalizeBudgetRange(data);
    assertEquals(data.gift_budget_no_ceiling, false);
  }
});

Deno.test(
  "a partial extraction that never asked for the flag gains none",
  () => {
    const data: Budget = { gift_budget_max: 80 };
    normalizeBudgetRange(data);
    assertEquals("gift_budget_no_ceiling" in data, false);
  }
);

Deno.test("a zero maximum is not a ceiling and leaves the flag set", () => {
  const data: Budget = { gift_budget_max: 0, gift_budget_no_ceiling: true };
  normalizeBudgetRange(data);
  assertEquals(data.gift_budget_no_ceiling, true);
});
