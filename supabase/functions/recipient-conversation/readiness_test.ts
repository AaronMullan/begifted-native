import { assert, assertEquals } from "jsr:@std/assert@1";
import { deriveAddRecipientReadiness } from "./readiness.ts";
import type { ContextInfo } from "../types.ts";

// The Daniel test (DEV-398): brother, "Birthday and Christmas", $100, age 44,
// "reads a lot, into sports, has two kids". Each case below is the extractor's
// read of the conversation at one turn; the derived state is what routes the
// reply. The three regressions this guards are: timing skipped, specificity
// follow-up skipped, and premature "ready".

function base(overrides: Partial<ContextInfo> = {}): ContextInfo {
  return {
    name: "Daniel",
    relationship: "brother",
    occasions_mentioned: ["birthday", "christmas"],
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

Deno.test("birthday named without a date blocks readiness on timing", () => {
  // Extractor dropped birthday from occasions_needing_dates (the real bug).
  const derived = deriveAddRecipientReadiness(base());
  assertEquals(derived.state, "captured_needs_timing");
  assert(!derived.hasTiming);
  assert(derived.pendingDates.some((o) => /birthday/i.test(o)));
});

Deno.test("captured birthday date satisfies timing", () => {
  const derived = deriveAddRecipientReadiness(base({ birthday: "--08-14" }));
  assert(derived.hasTiming);
  // Next missing field is price, not timing.
  assertEquals(derived.state, "captured_needs_price");
});

Deno.test("broad-only texture is not specificity — routes to follow-up", () => {
  const derived = deriveAddRecipientReadiness(
    base({
      birthday: "--08-14",
      has_price_guidance: true,
      has_age_context: true,
      interests: ["reading", "sports", "kids"],
      has_distinguishing_texture: false,
    })
  );
  assertEquals(derived.state, "captured_needs_specificity");
  assert(derived.textureNeedsFollowup);
  assert(!derived.hasSpecificity);
});

Deno.test("distinguishing texture completes the intake", () => {
  const derived = deriveAddRecipientReadiness(
    base({
      birthday: "--08-14",
      has_price_guidance: true,
      has_age_context: true,
      interests: ["mostly history and biographies"],
      has_distinguishing_texture: true,
    })
  );
  assertEquals(derived.state, "ready");
  assert(derived.hasSpecificity);
});

Deno.test(
  "one follow-up cap — already-used follow-up completes even if still broad",
  () => {
    const derived = deriveAddRecipientReadiness(
      base({
        birthday: "--08-14",
        has_price_guidance: true,
        has_age_context: true,
        interests: ["reading", "sports", "kids"],
        has_distinguishing_texture: false,
        specificity_followup_used: true,
      })
    );
    assertEquals(derived.state, "ready");
    assert(!derived.textureNeedsFollowup);
  }
);

Deno.test(
  "one sharpening follow-up asked completes even when the extractor drops specificity_followup_used",
  () => {
    // The Emily regression: broad texture, one follow-up asked, vague answer
    // ("nothing specific"). The extractor failed to flip specificity_followup_used,
    // but the mechanical count of sharpening questions caps it at one so the flow
    // cannot re-probe on a new topic (food → music → travel).
    const derived = deriveAddRecipientReadiness(
      base({
        birthday: "--08-14",
        has_price_guidance: true,
        has_age_context: true,
        interests: ["travel", "food", "music", "family"],
        has_distinguishing_texture: false,
        specificity_followup_used: false,
        specificity_followup_questions_asked: 1,
      })
    );
    assertEquals(derived.state, "ready");
    assert(derived.hasSpecificity);
    assert(!derived.textureNeedsFollowup);
  }
);

Deno.test(
  "one-follow-up cap — last assistant message was the follow-up completes on a vague answer",
  () => {
    // The Emily regression, driven by the per-turn signal instead of the
    // cumulative self-count: the assistant already asked ONE sharpening follow-up
    // ("what kind of food?"), the user answered vaguely ("nothing specific"), and
    // the extractor dropped both specificity_followup_used and the count. The
    // most-recent-assistant-message signal spends the opportunity so the runtime
    // cannot switch to a second broad signal (food → music).
    const derived = deriveAddRecipientReadiness(
      base({
        birthday: "--08-14",
        has_price_guidance: true,
        has_age_context: true,
        interests: ["travel", "food", "music", "family"],
        has_distinguishing_texture: false,
        specificity_followup_used: false,
        specificity_followup_questions_asked: 0,
        last_assistant_asked_specificity_followup: true,
      })
    );
    assertEquals(derived.state, "ready");
    assert(derived.hasSpecificity);
    assert(!derived.textureNeedsFollowup);
  }
);

Deno.test(
  "durable cap — a follow-up asked earlier completes even after an intervening price/age turn",
  () => {
    // Interleaved case: the follow-up was asked and answered vaguely, then a
    // required field (age) was captured on a later turn, so the per-turn
    // last_assistant_asked signal has reverted to false (the age question is now
    // the most recent assistant message). The cumulative count is the durable
    // backstop that still spends the opportunity — the runtime must not re-probe.
    const derived = deriveAddRecipientReadiness(
      base({
        birthday: "--08-14",
        has_price_guidance: true,
        has_age_context: true,
        interests: ["travel", "food", "music", "family"],
        has_distinguishing_texture: false,
        specificity_followup_used: false,
        last_assistant_asked_specificity_followup: false,
        specificity_followup_questions_asked: 1,
      })
    );
    assertEquals(derived.state, "ready");
    assert(derived.hasSpecificity);
    assert(!derived.textureNeedsFollowup);
  }
);

Deno.test(
  "initial open-ended ask (not a follow-up) still routes to the one follow-up",
  () => {
    // Last assistant message was the initial "what's Emily like?" (NOT a
    // sharpening follow-up) and the user just volunteered broad interests. The
    // one follow-up has not been spent, so we still ask it.
    const derived = deriveAddRecipientReadiness(
      base({
        birthday: "--08-14",
        has_price_guidance: true,
        has_age_context: true,
        interests: ["travel", "food", "music", "family"],
        has_distinguishing_texture: false,
        specificity_followup_used: false,
        specificity_followup_questions_asked: 0,
        last_assistant_asked_specificity_followup: false,
      })
    );
    assertEquals(derived.state, "captured_needs_specificity");
    assert(derived.textureNeedsFollowup);
  }
);

Deno.test(
  "broad texture with zero follow-ups asked still routes to the one follow-up",
  () => {
    const derived = deriveAddRecipientReadiness(
      base({
        birthday: "--08-14",
        has_price_guidance: true,
        has_age_context: true,
        interests: ["travel", "food", "music", "family"],
        has_distinguishing_texture: false,
        specificity_followup_used: false,
        specificity_followup_questions_asked: 0,
      })
    );
    assertEquals(derived.state, "captured_needs_specificity");
    assert(derived.textureNeedsFollowup);
  }
);

Deno.test(
  "child with no age and no birthday is asked for age/birthday before completing",
  () => {
    // Christmas needs no date, so timing is satisfied without a birthday — which
    // isolates the age gate. The recipient reads as a child, so age is required.
    const derived = deriveAddRecipientReadiness(
      base({
        occasions_mentioned: ["christmas"],
        has_price_guidance: true,
        has_age_context: false,
        recipient_is_child: true,
      })
    );
    assertEquals(derived.state, "captured_needs_age");
    assert(!derived.hasAge);
  }
);

Deno.test(
  "a child's full birthday (with year) satisfies the age requirement",
  () => {
    const derived = deriveAddRecipientReadiness(
      base({
        occasions_mentioned: ["christmas"],
        has_price_guidance: true,
        has_age_context: false,
        recipient_is_child: true,
        birthday: "2018-05-01",
      })
    );
    assert(derived.hasAge);
    assert(derived.state !== "captured_needs_age");
    assertEquals(derived.state, "captured_needs_specificity");
  }
);

Deno.test(
  "a child's year-less birthday does NOT satisfy the age requirement",
  () => {
    // The extractor records MM-DD when the year is unknown; age isn't derivable
    // from that, so the flow must still ask for the child's age.
    for (const birthday of ["05-01", "--08-14"]) {
      const derived = deriveAddRecipientReadiness(
        base({
          occasions_mentioned: ["christmas"],
          has_price_guidance: true,
          has_age_context: false,
          recipient_is_child: true,
          birthday,
        })
      );
      assert(!derived.hasAge, `${birthday} should not satisfy the age gate`);
      assertEquals(derived.state, "captured_needs_age");
    }
  }
);

Deno.test("a child's explicit age satisfies the age requirement", () => {
  const derived = deriveAddRecipientReadiness(
    base({
      occasions_mentioned: ["christmas"],
      has_price_guidance: true,
      has_age_context: true,
      recipient_is_child: true,
    })
  );
  assert(derived.state !== "captured_needs_age");
  assertEquals(derived.state, "captured_needs_specificity");
});

Deno.test("non-child is never gated on age — it stays optional", () => {
  // Adult with price captured but no age and no birthday still moves past the
  // age slot straight to texture; a distinguishing detail then completes it
  // without ever asking age.
  const needsTexture = deriveAddRecipientReadiness(
    base({
      occasions_mentioned: ["christmas"],
      has_price_guidance: true,
      has_age_context: false,
      recipient_is_child: false,
    })
  );
  assertEquals(needsTexture.state, "captured_needs_specificity");

  const ready = deriveAddRecipientReadiness(
    base({
      occasions_mentioned: ["christmas"],
      has_price_guidance: true,
      has_age_context: false,
      recipient_is_child: false,
      has_distinguishing_texture: true,
    })
  );
  assertEquals(ready.state, "ready");
});

Deno.test("explicit skip completes the intake", () => {
  const derived = deriveAddRecipientReadiness(
    base({
      birthday: "--08-14",
      has_price_guidance: true,
      has_age_context: true,
      user_skipped_specificity: true,
    })
  );
  assertEquals(derived.state, "ready");
});

Deno.test(
  "missing texture asks the initial open-ended question, not the follow-up",
  () => {
    const derived = deriveAddRecipientReadiness(
      base({
        birthday: "--08-14",
        has_price_guidance: true,
        has_age_context: true,
        interests: [],
      })
    );
    assertEquals(derived.state, "captured_needs_specificity");
    assert(!derived.textureNeedsFollowup);
  }
);

Deno.test(
  "termination guard completes a stuck texture loop after the turn cap",
  () => {
    // Extractor never flips specificity_followup_used; without the guard this
    // would loop forever and the next-step button (ready-only) would never show.
    const stuck = base({
      birthday: "--08-14",
      has_price_guidance: true,
      has_age_context: true,
      interests: ["reading", "sports", "kids"],
      has_distinguishing_texture: false,
      specificity_followup_used: false,
    });
    assertEquals(
      deriveAddRecipientReadiness(stuck, 9).state,
      "captured_needs_specificity"
    );
    assertEquals(deriveAddRecipientReadiness(stuck, 10).state, "ready");
  }
);

Deno.test(
  "termination guard cannot force-complete a missing higher-priority field",
  () => {
    // Price still missing at a high turn count → guard must NOT fire; the flow
    // stays on price, never jumping to ready on an incomplete recipient.
    const noPrice = base({
      birthday: "--08-14",
      has_price_guidance: false,
      has_age_context: true,
      interests: ["reading", "sports", "kids"],
    });
    assertEquals(
      deriveAddRecipientReadiness(noPrice, 20).state,
      "captured_needs_price"
    );
  }
);

Deno.test("no recipient identity is not_captured", () => {
  const derived = deriveAddRecipientReadiness(
    base({ name: null, relationship: null })
  );
  assertEquals(derived.state, "not_captured");
});

Deno.test("inferable-only occasions (Christmas) need no date", () => {
  const derived = deriveAddRecipientReadiness(
    base({ occasions_mentioned: ["christmas"] })
  );
  assert(derived.hasTiming);
  assertEquals(derived.pendingDates.length, 0);
});

Deno.test(
  "extractor-reported non-birthday pending date still blocks timing",
  () => {
    const derived = deriveAddRecipientReadiness(
      base({
        occasions_mentioned: ["graduation"],
        occasions_needing_dates: ["graduation"],
      })
    );
    assertEquals(derived.state, "captured_needs_timing");
    assert(!derived.hasTiming);
  }
);
