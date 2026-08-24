import { assert, assertStringIncludes } from "jsr:@std/assert@1";
import { buildPriorityGuidance } from "./prompts.ts";
import type { ContextInfo } from "../types.ts";

// buildPriorityGuidance must reflect the SINGLE canonical readiness state so the
// reply LLM's question-selection agrees with the readiness/completion gates: a
// field satisfied in canonical state is announced as captured, so the model
// never re-asks it. This is the Sarah failure — "my friend Sarah" established
// relationship, yet the model still asked "What's your relationship to Sarah?".

function ctx(partial: Partial<ContextInfo>): ContextInfo {
  return {
    readiness: {
      state: "ready",
      gift_ready: true,
      has_recipient_anchor: true,
      has_occasion_anchor: true,
      has_timing_anchor: true,
      has_price_anchor: true,
      has_age_anchor: true,
      has_specificity_anchor: true,
      missing_requirements: [],
      reason: "",
    },
    ...partial,
  };
}

Deno.test(
  "relationship captured from the first message is marked do-not-ask",
  () => {
    const g = buildPriorityGuidance(
      ctx({ name: "Sarah", relationship: "friend" }),
      "Sarah"
    );
    assertStringIncludes(g, "already captured (name + relationship)");
    assert(
      !/ask about who this person is/i.test(g),
      "must not tell the model to ask for identity once captured"
    );
  }
);

Deno.test("a missing field still gets its normal ask instruction", () => {
  const g = buildPriorityGuidance(
    ctx({
      name: "Sarah",
      relationship: "friend",
      readiness: {
        state: "captured_needs_price",
        gift_ready: false,
        has_recipient_anchor: true,
        has_occasion_anchor: true,
        has_timing_anchor: true,
        has_price_anchor: false,
        has_age_anchor: false,
        has_specificity_anchor: false,
        missing_requirements: [],
        reason: "",
      },
    }),
    "Sarah"
  );
  // Captured fields marked done…
  assertStringIncludes(g, "already captured (name + relationship)");
  // …price still open, so the ask survives.
  assertStringIncludes(g, "how much the user would like to spend for Sarah");
  assert(
    !/do NOT ask about spend again/i.test(g),
    "an uncaptured field must not be marked captured"
  );
});

Deno.test("name without relationship asks only for the relationship", () => {
  const g = buildPriorityGuidance(
    ctx({
      name: "Sarah",
      relationship: null,
      readiness: {
        state: "not_captured",
        gift_ready: false,
        has_recipient_anchor: false,
        has_occasion_anchor: false,
        has_timing_anchor: false,
        has_price_anchor: false,
        has_age_anchor: false,
        has_specificity_anchor: false,
        missing_requirements: [],
        reason: "",
      },
    }),
    "Sarah"
  );
  assertStringIncludes(g, "relationship still missing");
});
