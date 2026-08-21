/**
 * Deterministic readiness derivation for the add-recipient flow.
 *
 * The conversation prompt is authoritative on wording and judgment, but the
 * runtime still needs a reliable, prompt-independent gate for two things the
 * model cannot be trusted to enforce turn-to-turn:
 *   - required occasion timing is captured before price/age/texture, and
 *   - the recipient reaches "ready" (which fires the hardcoded completion and
 *     the next-step button) only when every required field is genuinely done.
 *
 * Pure module — no env, no AI, no I/O — so Deno tests can import it directly.
 * `contextInfo` is the extractor's per-turn read of the conversation; this
 * function converts it into the readiness state that routes the reply.
 */

import type { ContextInfo, ReadinessState } from "../types.ts";

export interface DerivedReadiness {
  state: ReadinessState;
  hasRecipientAnchor: boolean;
  hasOccasion: boolean;
  hasTiming: boolean;
  hasPrice: boolean;
  hasAge: boolean;
  hasSpecificity: boolean;
  /**
   * Effective list of occasions still needing a user-provided date, including
   * the deterministic birthday backstop. Feeds priorityGuidance so the model
   * is told exactly which date to ask for.
   */
  pendingDates: string[];
  /**
   * True when texture exists but is only broad/personality-level and the one
   * allowed specificity follow-up has not happened yet — i.e. this is the
   * follow-up turn, not the initial texture ask.
   */
  textureNeedsFollowup: boolean;
}

const BIRTHDAY_RE = /birth\s*day|bday/i;

function mentionsBirthday(occasions: unknown[]): boolean {
  return occasions.some((o) => BIRTHDAY_RE.test(String(o)));
}

/**
 * Deterministic termination guard. The one-follow-up cap relies on the
 * extractor flipping specificity_followup_used; if it never does, the flow
 * would re-enter captured_needs_specificity every turn and the next-step
 * button (shown only at "ready") would never appear — the user stuck in
 * endless texture probing. Once the intake has run this many assistant turns
 * and the ONLY thing still missing is texture, force completion. Texture is
 * the only field this can force; timing/price/age keep their own hard gates,
 * so a genuinely incomplete recipient can never be force-completed on them.
 * Set above the longest legitimate intake (identity → relationship → occasion
 * → two dated occasions → price → age → initial texture → one follow-up).
 */
const SPECIFICITY_TURN_CAP = 10;

export function deriveAddRecipientReadiness(
  contextInfo: ContextInfo,
  assistantTurns = 0
): DerivedReadiness {
  const hasName = !!(contextInfo.name || contextInfo.existing_name);
  const hasRelationship = !!(
    contextInfo.relationship || contextInfo.existing_relationship
  );
  const hasRecipientAnchor = hasName && hasRelationship;

  const birthday = contextInfo.birthday || contextInfo.existing_birthday;
  const occasionsMentioned = Array.isArray(contextInfo.occasions_mentioned)
    ? contextInfo.occasions_mentioned
    : [];
  const hasOccasion = !!birthday || occasionsMentioned.length > 0;

  // A birthday is never inferable. If a birthday occasion is named but no
  // birthday date is captured, timing is still missing — independent of
  // whatever the extractor happened to put in occasions_needing_dates (which
  // it routinely drops, skipping the birthday question entirely).
  const birthdayNeedsDate = mentionsBirthday(occasionsMentioned) && !birthday;
  const extractorPending = Array.isArray(contextInfo.occasions_needing_dates)
    ? contextInfo.occasions_needing_dates
    : [];
  const pendingDates = [...extractorPending];
  if (birthdayNeedsDate && !mentionsBirthday(pendingDates)) {
    pendingDates.push("birthday");
  }
  const hasTiming =
    !contextInfo.needs_occasion_date && pendingDates.length === 0;

  const hasPrice = !!contextInfo.has_price_guidance;
  // Age gate is child-conditional: a recipient that reads as a child needs an
  // age (or a birthday, from which age is derivable) before completion, so gift
  // suggestions don't skew old. For everyone else age stays optional — asking
  // every adult their age cuts against a light onboarding, and nothing else
  // requires it. has_age_context already counts explicit age/grade/life-stage; a
  // birthday satisfies the gate too so a child with a birthday is never re-asked.
  const hasBirthday = !!birthday;
  const isChild = !!contextInfo.recipient_is_child;
  const hasAge = !!contextInfo.has_age_context || hasBirthday;
  const ageRequirementMet = !isChild || hasAge;

  // Specificity is NOT satisfied by broad interests (books, sports, "has
  // kids"). It needs a distinguishing signal, an explicit skip, or the one
  // allowed follow-up already spent.
  //
  // The one-follow-up cap is enforced from a per-turn signal the runtime owns:
  // once the assistant's MOST RECENT message was a sharpening follow-up, that
  // one opportunity is spent and texture completes on this turn no matter how
  // the user answered — so a vague reply ("nothing specific") can't reopen the
  // enrichment decision and re-probe on a new topic (food → music → travel).
  // last_assistant_asked_specificity_followup is a reliable single-message
  // classification; the earlier cumulative self-count and the "have I used my
  // opportunity?" judgment are kept only as backstops — both undercounted the
  // Emily case (the extractor drops them when the follow-up answer is vague),
  // which is exactly what the per-turn signal fixes.
  const hasDistinguishing = !!contextInfo.has_distinguishing_texture;
  const followupUsed =
    !!contextInfo.last_assistant_asked_specificity_followup ||
    !!contextInfo.specificity_followup_used ||
    (contextInfo.specificity_followup_questions_asked ?? 0) >= 1;
  let hasSpecificity =
    hasDistinguishing || !!contextInfo.user_skipped_specificity || followupUsed;

  let state: ReadinessState;
  if (!hasRecipientAnchor) {
    state = "not_captured";
  } else if (!hasOccasion) {
    state = hasSpecificity ? "captured_needs_occasion" : "captured_needs_both";
  } else if (!hasTiming) {
    state = "captured_needs_timing";
  } else if (!hasPrice) {
    state = "captured_needs_price";
  } else if (!ageRequirementMet) {
    state = "captured_needs_age";
  } else if (!hasSpecificity) {
    state = "captured_needs_specificity";
  } else {
    state = "ready";
  }

  // Guard only texture: every other field is already captured in this state.
  if (
    state === "captured_needs_specificity" &&
    assistantTurns >= SPECIFICITY_TURN_CAP
  ) {
    hasSpecificity = true;
    state = "ready";
  }

  const interestCount = Array.isArray(contextInfo.interests)
    ? contextInfo.interests.length
    : 0;
  // Broad texture already present (interests captured) but not distinguishing
  // and no follow-up spent → the next texture ask is the sharpening follow-up,
  // not the initial open-ended ask.
  const textureNeedsFollowup =
    state === "captured_needs_specificity" && interestCount > 0;

  return {
    state,
    hasRecipientAnchor,
    hasOccasion,
    hasTiming,
    hasPrice,
    hasAge,
    hasSpecificity,
    pendingDates,
    textureNeedsFollowup,
  };
}
