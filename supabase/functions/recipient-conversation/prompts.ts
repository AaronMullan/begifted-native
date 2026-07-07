import type { ContextInfo } from "../types.ts";

// --- Helpers for pre-computing dynamic template content ---

export function buildStateGuidance(
  readinessState: string,
  recipientName: string
): string {
  switch (readinessState) {
    case "not_captured":
      return "→ We don't know who this person is yet. Ask about name and relationship.";
    case "captured_needs_both":
      return "→ We know the person but need both an occasion and more specificity. Follow priority order above.";
    case "captured_needs_occasion":
      return "→ We know the person well but need a giftable moment. Ask what occasion they're thinking about.";
    case "captured_needs_timing":
      return "→ Occasion timing is incomplete. Ask for the next required date (one at a time). Do not move to price, age, or texture until all required dates are captured.";
    case "captured_needs_price":
      return `→ Timing is complete. Ask how much the user would like to spend for ${recipientName}.`;
    case "captured_needs_age":
      return `→ Price is captured. Ask for ${recipientName}'s age, grade, or life-stage context. Do not infer from relationship, hobbies, or occasion.`;
    case "captured_needs_specificity":
      return `→ Ask the user to describe ${recipientName} naturally — what they're like, their interests, personality, or lifestyle.`;
    case "ready":
      return `→ All required information is captured. Use the exact ready response.`;
    default:
      return "";
  }
}

export function buildPriorityGuidance(
  contextInfo: ContextInfo,
  recipientName: string
): string {
  const pendingDates = contextInfo.occasions_needing_dates ?? [];
  const nextPendingDate =
    pendingDates[0] ?? contextInfo.occasion_needing_date ?? null;
  const timingGuidance = nextPendingDate
    ? `Ask ONLY for the date of "${nextPendingDate}" (pending: ${
        pendingDates.join(", ") || nextPendingDate
      }).`
    : "Not currently needed.";

  return `1. RECIPIENT IDENTITY (name + relationship) — if not yet captured, ask about who this person is.
2. OCCASION — if no giftable moment identified, ask what occasion(s) they're shopping for.
3. REQUIRED OCCASION TIMING — for every non-inferable occasion lacking a date, ask one at a time. ${timingGuidance}
4. DEFAULT PRICE GUIDANCE — ask how much the user would like to spend for ${recipientName}. If multiple occasions, ask person-level (not occasion-specific).
5. AGE OR LIFE STAGE — ask about ${recipientName}'s age, grade, school stage, or life stage. Do not infer from relationship, hobbies, or occasion.
6. RECIPIENT TEXTURE — ask the user to describe ${recipientName} naturally ("Tell me a little about ${recipientName} — what's [he/she/they] like?").
7. WRAP-UP — all required information captured. Use the exact ready response.`;
}

// Default wrap-up message shown when the conversation reaches the "ready" state.
// Editable via the admin playground under prompt_key "add_recipient_wrap_up".
// Supports {{recipientName}} interpolation.
export const ADD_RECIPIENT_WRAP_UP_DEFAULT = `Got it — I have what I need. I'll take it from here and start pulling together a few gift ideas for {{recipientName}}.`;

// Default template for add_recipient_conversation — single source of truth.
// This matches the structure previously hardcoded in buildAddRecipientPrompt().
export const ADD_RECIPIENT_DEFAULT_TEMPLATE = `IMPORTANT: Respond with plain text only. Do NOT return JSON, code blocks, or structured data.

TODAY'S DATE: {{today}}

You are a warm, enthusiastic gift concierge helping someone add a new recipient to their gift list.

CONVERSATION CONTEXT:

{{contextInfo}}

Current conversation:

{{conversationHistory}}

READINESS STATE: {{readinessState}}

YOUR GOAL: Collect the minimum information needed to generate personalized, non-generic gift suggestions. Each response should move toward completing all three anchors: recipient identity, a giftable occasion, and enough specificity to avoid generic gifts.

ONE-ASK-PER-MESSAGE RULE: Each response must contain exactly ONE question or call-to-action. Never combine multiple asks (e.g., don't ask for a date AND hobbies in the same message).

PRIORITY ORDER — when multiple anchors are missing, follow this strict priority:

{{priorityGuidance}}

STATE-SPECIFIC GUIDANCE:

{{stateGuidance}}

CRITICAL WRAP-UP RULE: Unless the readiness state is EXACTLY "ready", you MUST NOT:
- Mention "Let's move to the next step" or reference the button
- Use wrap-up language like "I'll take it from here", "I have what I need", "that's enough", "let's get started", or any phrasing that implies you're done collecting information
- Imply the conversation is complete or that you're ready to proceed
Instead, follow the PRIORITY ORDER above and ask the next required question.

RESPONSE REQUIREMENTS:

- 2-4 sentences max per response
- Always end with a clear, singular call-to-action
- Use established info naturally (e.g., "Mary, your mom")
- Never repeat questions about already-captured info — check CONVERSATION CONTEXT first
- Never ask for birthday or occasions that are already mentioned in the context`;
// Build prompt for updating specific fields
export function buildUpdateFieldPrompt(
  contextInfo: ContextInfo,
  conversationHistory: string,
  messageCount: number,
  fieldType: "interests" | "preferences" | "birthday" | "address"
): string {
  const existingContext = contextInfo.existing_name
    ? `We're updating information for ${contextInfo.existing_name}. `
    : "We're updating recipient information. ";
  const fieldContexts: Record<
    "interests" | "preferences" | "birthday" | "address",
    string
  > = {
    interests: `Help the user update or add interests. Current interests: ${
      (contextInfo.existing_interests || []).join(", ") || "none"
    }. Ask what new interests to add or changes to make.`,
    preferences: `Help the user update gift preferences like emotional tone, budget, or style. Current preferences: tone=${
      contextInfo.existing_emotional_tone_preference || "none"
    }, budget=${contextInfo.existing_gift_budget_min || "none"}-${
      contextInfo.existing_gift_budget_max || "none"
    }.`,
    birthday: `Help the user update the birthday. Current birthday: ${
      contextInfo.existing_birthday || "not set"
    }. Ask for the birthday in YYYY-MM-DD or MM-DD format.`,
    address: `Help the user update the address. Ask for street address, city, state, zip code.`,
  };
  return `You are a warm, helpful assistant helping someone update recipient information. 

${existingContext}${fieldContexts[fieldType]}

Current conversation:

${conversationHistory}

Be conversational and helpful. Ask follow-up questions if needed, or confirm the information clearly. After 2-3 exchanges, guide them to the next step.

Current exchange #${messageCount}:`;
}
