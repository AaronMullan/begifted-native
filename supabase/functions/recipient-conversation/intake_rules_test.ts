import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  DEFAULT_INTAKE_RULES,
  parseIntakeRules,
  renderRequiredFields,
  serializeIntakeRules,
} from "./intake-rules.ts";
import type { IntakeRules } from "./intake-rules.ts";
import { deriveAddRecipientReadiness } from "./readiness.ts";
import { buildStateGuidance } from "./prompts.ts";
import type { ContextInfo } from "../types.ts";

function rulesWith(edit: (fields: Record<string, unknown>[]) => void): string {
  const doc = JSON.parse(serializeIntakeRules(DEFAULT_INTAKE_RULES));
  edit(doc.fields);
  return JSON.stringify(doc);
}

function parsed(text: string): IntakeRules {
  const result = parseIntakeRules(text);
  if (!result.ok) throw new Error(result.errors.join(" "));
  return result.rules;
}

function field(fields: Record<string, unknown>[], name: string) {
  return fields.find((f) => f.field === name)!;
}

function base(overrides: Partial<ContextInfo> = {}): ContextInfo {
  return {
    name: "Daniel",
    relationship: "brother",
    occasions_mentioned: ["birthday"],
    needs_occasion_date: false,
    occasions_needing_dates: [],
    has_price_guidance: false,
    has_age_context: false,
    has_distinguishing_texture: false,
    specificity_followup_used: false,
    user_skipped_specificity: false,
    interests: [],
    ...overrides,
  };
}

Deno.test("the stored default parses back to the code default", () => {
  assertEquals(
    parsed(serializeIntakeRules(DEFAULT_INTAKE_RULES)),
    DEFAULT_INTAKE_RULES
  );
});

Deno.test("the seeded v1 row is the code default", () => {
  // Kept in step with supabase/migrations/20261012000003_seed_add_recipient_rules.sql.
  const seeded = `{"fields":[{"field":"identity","required":true},{"field":"occasion","required":true},{"field":"timing","required":true,"approximate_birthday":true},{"field":"price","required":true},{"field":"age","required":true,"full_birthday_counts":true,"birth_year_counts":true},{"field":"texture","required":true,"follow_up":true,"turn_cap":10}]}`;
  assertEquals(parsed(seeded), DEFAULT_INTAKE_RULES);
});

Deno.test("invalid rules are rejected with a reason, never defaulted", () => {
  const cases: [string, RegExp][] = [
    ["not json", /Not valid JSON/],
    ["{}", /"fields" list/],
    [rulesWith((f) => f.reverse()), /"identity" must be the first/],
    [
      rulesWith((f) => (field(f, "identity").required = false)),
      /must be required/,
    ],
    [rulesWith((f) => f.splice(3, 1)), /Missing fields: price/],
    [
      rulesWith((f) => f.push({ field: "price", required: true })),
      /more than once/,
    ],
    [
      rulesWith((f) => (field(f, "age").birth_year_count = true)),
      /unknown option "birth_year_count"/,
    ],
    [
      rulesWith((f) => (field(f, "timing").approximate_birthday = "yes")),
      /true or false/,
    ],
    [rulesWith((f) => (field(f, "texture").turn_cap = 0)), /turn_cap/],
    [
      rulesWith((f) => {
        const [occasion] = f.splice(1, 1);
        f.splice(2, 0, occasion);
      }),
      /"timing" must come after "occasion"/,
    ],
  ];
  for (const [text, expected] of cases) {
    const result = parseIntakeRules(text);
    assert(!result.ok, text);
    assert(
      result.errors.some((e) => expected.test(e)),
      `${text}: ${result.errors.join(" | ")}`
    );
  }
});

Deno.test("default rules leave stateGuidance unchanged", () => {
  assertEquals(
    buildStateGuidance("captured_needs_timing", "Joshua"),
    "→ Occasion timing is incomplete. Ask for the next required date (one at a time). Do not move to price, age, or texture until all required dates are captured."
  );
  assertEquals(
    buildStateGuidance("captured_needs_price", "Joshua"),
    "→ Timing is complete. Ask how much the user would like to spend for Joshua."
  );
  assertEquals(
    buildStateGuidance("captured_needs_age", "Joshua"),
    "→ We still need Joshua's age so gift ideas aren't age-inappropriate. Ask for Joshua's age (their full birthday, including the year, works too — it lets us derive the age). Ask for only one thing; do not infer it from relationship, hobbies, or occasion."
  );
});

Deno.test(
  "an exact-day rule makes an approximate birthday still missing",
  () => {
    const rules = parsed(
      rulesWith((f) => (field(f, "timing").approximate_birthday = false))
    );
    const ctx = base({ birthday: "03-08/03-14" });
    assertEquals(
      deriveAddRecipientReadiness(ctx).state,
      "captured_needs_price"
    );
    const derived = deriveAddRecipientReadiness(ctx, 0, rules);
    assertEquals(derived.state, "captured_needs_timing");
    assert(derived.pendingDates.includes("birthday"));
    assert(
      /not enough; ask for the exact day/.test(renderRequiredFields(rules))
    );
  }
);

Deno.test("a field that is not required is skipped, not asked", () => {
  const rules = parsed(rulesWith((f) => (field(f, "age").required = false)));
  const derived = deriveAddRecipientReadiness(
    base({ birthday: "--08-14", has_price_guidance: true }),
    0,
    rules
  );
  assertEquals(derived.state, "captured_needs_specificity");
  assert(!derived.hasAge);
  assertEquals(derived.missingRequirements, ["specificity_anchor"]);
  assert(/do not ask for age/.test(renderRequiredFields(rules)));
  assert(
    !/age/.test(buildStateGuidance("captured_needs_timing", "D", false, rules))
  );
});

Deno.test("question order follows the rules", () => {
  const rules = parsed(
    rulesWith((f) => {
      const [age] = f.splice(4, 1);
      f.splice(3, 0, age);
    })
  );
  const ctx = base({ birthday: "--08-14" });
  assertEquals(deriveAddRecipientReadiness(ctx).state, "captured_needs_price");
  assertEquals(
    deriveAddRecipientReadiness(ctx, 0, rules).state,
    "captured_needs_age"
  );
  assertEquals(
    buildStateGuidance("captured_needs_timing", "D", false, rules),
    "→ Occasion timing is incomplete. Ask for the next required date (one at a time). Do not move to age, price, or texture until all required dates are captured."
  );
});

Deno.test("age signals count only when the rules say so", () => {
  const rules = parsed(
    rulesWith((f) => {
      field(f, "age").full_birthday_counts = false;
      field(f, "age").birth_year_counts = false;
    })
  );
  for (const birthday of ["2009-10-06", "2009"]) {
    const ctx = base({ birthday, has_price_guidance: true });
    assert(deriveAddRecipientReadiness(ctx).hasAge, birthday);
    assert(!deriveAddRecipientReadiness(ctx, 0, rules).hasAge, birthday);
  }
  assert(
    !/full birthday/.test(
      buildStateGuidance("captured_needs_age", "D", false, rules)
    )
  );
});

Deno.test("with follow-ups off, a broad texture answer completes", () => {
  const rules = parsed(
    rulesWith((f) => (field(f, "texture").follow_up = false))
  );
  const ctx = base({
    birthday: "1980-08-14",
    has_price_guidance: true,
    interests: ["books", "sports"],
  });
  const derived = deriveAddRecipientReadiness(ctx);
  assertEquals(derived.state, "captured_needs_specificity");
  assert(derived.textureNeedsFollowup);
  assertEquals(deriveAddRecipientReadiness(ctx, 0, rules).state, "ready");
  // No texture at all is still missing.
  assertEquals(
    deriveAddRecipientReadiness({ ...ctx, interests: [] }, 0, rules).state,
    "captured_needs_specificity"
  );
});

Deno.test(
  "the texture turn cap never completes past another missing field",
  () => {
    const rules = parsed(
      rulesWith((f) => {
        const [texture] = f.splice(5, 1);
        f.splice(3, 0, texture);
        field(f, "texture").turn_cap = 2;
      })
    );
    // Texture is asked before price here; price is still missing, so the cap
    // moves on to price rather than forcing "ready".
    const derived = deriveAddRecipientReadiness(
      base({ birthday: "1980-08-14" }),
      5,
      rules
    );
    assertEquals(derived.state, "captured_needs_price");
  }
);

Deno.test("an option at the top level is rejected, not ignored", () => {
  const result = parseIntakeRules(
    rulesWith(() => {}).replace(/^\{/, '{"turn_cap":3,')
  );
  assert(!result.ok);
  assert(
    result.errors.some((e) => /Unknown top-level option "turn_cap"/.test(e))
  );
});

Deno.test("the turn cap moves past texture when it is asked early", () => {
  const rules = parsed(
    rulesWith((f) => {
      const [texture] = f.splice(5, 1);
      f.splice(1, 0, texture);
      field(f, "texture").turn_cap = 2;
    })
  );
  const ctx = base({ occasions_mentioned: [], interests: ["books"] });
  assertEquals(
    deriveAddRecipientReadiness(ctx, 1, rules).state,
    "captured_needs_specificity"
  );
  const capped = deriveAddRecipientReadiness(ctx, 2, rules);
  assertEquals(capped.state, "captured_needs_occasion");
  assert(!capped.missingRequirements.includes("specificity_anchor"));
});
