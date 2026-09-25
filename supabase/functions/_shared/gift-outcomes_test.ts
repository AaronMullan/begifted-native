import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import {
  buildGiverChoiceContext,
  buildRecipientOutcomeContext,
  latestDecisionPerGift,
} from "./gift-outcomes.ts";
import type { FeedbackRow } from "./gift-outcomes.ts";

const row = (over: Partial<FeedbackRow>): FeedbackRow => ({
  gift_suggestion_id: "g1",
  recipient_id: "nephew",
  occasion_id: "bday",
  action: "chose",
  gift_title: "Pokémon backpack",
  price: 40,
  created_at: "2026-09-01T00:00:00Z",
  ...over,
});

Deno.test("latest decision wins, and free-text notes never mask it", () => {
  const decisions = latestDecisionPerGift([
    row({ action: "keep_in_mix", created_at: "2026-09-01T00:00:00Z" }),
    row({ action: "chose", created_at: "2026-09-02T00:00:00Z" }),
    row({ action: "gift_feedback", created_at: "2026-09-03T00:00:00Z" }),
  ]);
  assertEquals(decisions.length, 1);
  assertEquals(decisions[0].action, "chose");
});

Deno.test("giver context carries tiers and prices, never titles", () => {
  const decisions = [
    row({}),
    row({
      gift_suggestion_id: "g2",
      recipient_id: "spouse",
      occasion_id: "anniv",
      gift_title: "Hand-thrown mug",
      price: "120.00",
    }),
  ];
  const context = buildGiverChoiceContext(
    decisions,
    new Map([
      ["nephew", "Nephew"],
      ["spouse", "spouse"],
    ]),
    [
      {
        recipient_id: "nephew",
        occasion_id: "bday",
        generated_at: "2026-08-30T00:00:00Z",
      },
      {
        recipient_id: "nephew",
        occasion_id: "bday",
        generated_at: "2026-08-31T00:00:00Z",
      },
      // Generated after the choice, so it was not on offer.
      {
        recipient_id: "nephew",
        occasion_id: "bday",
        generated_at: "2026-09-05T00:00:00Z",
      },
    ]
  );
  assertStringIncludes(context, "- nephew: 1 gift chosen, $40");
  assertStringIncludes(context, "- spouse: 1 gift chosen, $120");
  assertStringIncludes(context, "median 2 (range 2–2)");
  assert(!context.includes("Pokémon"));
  assert(!context.includes("mug"));
});

Deno.test("giver context is empty when nothing was chosen", () => {
  assertEquals(
    buildGiverChoiceContext([row({ action: "not_for_them" })], new Map(), []),
    ""
  );
});

Deno.test("recipient context weighs choices against rejections", () => {
  const context = buildRecipientOutcomeContext(
    [
      row({}),
      row({
        gift_suggestion_id: "g2",
        action: "already_have",
        gift_title: "Lego set",
      }),
      row({ gift_suggestion_id: "g3", action: "keep_in_mix" }),
    ],
    new Map([["bday", "birthday"]])
  );
  assertStringIncludes(context, "- Pokémon backpack ($40) — for birthday");
  assertStringIncludes(context, "Already owns (do not repeat):\n- Lego set");
});

Deno.test(
  "a recurring occasion counts only ideas since the last choice",
  () => {
    const ideas = (days: string[]) =>
      days.map((d) => ({
        recipient_id: "nephew",
        occasion_id: "bday",
        generated_at: `${d}T00:00:00Z`,
      }));
    const context = buildGiverChoiceContext(
      [
        row({ created_at: "2025-09-10T00:00:00Z" }),
        row({ gift_suggestion_id: "g2", created_at: "2026-09-10T00:00:00Z" }),
      ],
      new Map([["nephew", "nephew"]]),
      ideas(["2025-09-01", "2025-09-02", "2026-09-01", "2026-09-02"])
    );
    assertStringIncludes(context, "median 2 (range 2–2)");
  }
);
