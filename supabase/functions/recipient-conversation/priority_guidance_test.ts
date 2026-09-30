import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
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

const NOTHING_CAPTURED = {
  state: "not_captured" as const,
  gift_ready: false,
  has_recipient_anchor: false,
  has_occasion_anchor: false,
  has_timing_anchor: false,
  has_price_anchor: false,
  has_age_anchor: false,
  has_specificity_anchor: false,
  missing_requirements: [],
  reason: "",
};

Deno.test(
  "relationship captured from the first message is marked do-not-ask",
  () => {
    const g = buildPriorityGuidance(
      ctx({ name: "Sarah", relationship: "friend" })
    );
    assertStringIncludes(g, "do not ask for these again");
    assertStringIncludes(g, "- name and relationship");
  }
);

Deno.test("an uncaptured field is not listed as captured", () => {
  const g = buildPriorityGuidance(
    ctx({
      name: "Sarah",
      relationship: "friend",
      readiness: {
        ...NOTHING_CAPTURED,
        state: "captured_needs_price",
        has_recipient_anchor: true,
        has_occasion_anchor: true,
        has_timing_anchor: true,
      },
    })
  );
  assertStringIncludes(g, "- name and relationship");
  assertStringIncludes(g, "- occasion");
  assertStringIncludes(g, "- all required dates");
  assert(!g.includes("gift amount"), "price is still open");
  assert(!g.includes("age or life stage"), "age is still open");
});

Deno.test("name without relationship lists only the name", () => {
  const g = buildPriorityGuidance(
    ctx({ name: "Sarah", relationship: null, readiness: NOTHING_CAPTURED })
  );
  assertStringIncludes(g, "- name");
  assert(!g.includes("relationship"), "relationship is still open");
});

// The block sits after the prompt's refusal rules; an ask instruction there
// outranks them, so it must never tell the model to ask for anything.
Deno.test("the block never instructs the model to ask", () => {
  assertEquals(
    buildPriorityGuidance(ctx({ readiness: NOTHING_CAPTURED })),
    "Nothing captured yet."
  );
  const partial = buildPriorityGuidance(
    ctx({ name: "Sarah", readiness: NOTHING_CAPTURED })
  );
  assertEquals(
    partial,
    "Already captured — do not ask for these again:\n- name"
  );
});

Deno.test("dates are not announced before an occasion exists", () => {
  // The runtime derives has_timing_anchor true when nothing is pending, which
  // is also the case before any occasion has been named.
  const g = buildPriorityGuidance(
    ctx({
      name: "Sarah",
      relationship: "friend",
      readiness: {
        ...NOTHING_CAPTURED,
        state: "captured_needs_occasion",
        has_recipient_anchor: true,
        has_timing_anchor: true,
      },
    })
  );
  assert(!g.includes("all required dates"));
});
