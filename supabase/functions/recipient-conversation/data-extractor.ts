import { loadActivePrompt } from "../_shared/prompt-loader.ts";
import { type Provider, type AIOverride } from "../_shared/ai-config-loader.ts";
import { callAI, getApiKey, CONVERSATION_MODEL } from "../_shared/ai-client.ts";
import type {
  ContextInfo,
  ConversationResponse,
  ConversationType,
  ExtractedData,
  ExtractionResponse,
  Message,
  RecipientData,
} from "../types.ts";
import { parseOpenAIJSON } from "./utils.ts";
// @ts-ignore - Deno environment variables are resolved at runtime
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
// @ts-ignore - Deno environment variables are resolved at runtime
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type AIConfig = { provider: Provider; model: string; apiKey: string };

async function resolveAIConfig(
  override?: AIOverride,
  defaultModel: string = CONVERSATION_MODEL
): Promise<AIConfig> {
  if (override?.provider && override?.model) {
    return {
      provider: override.provider,
      model: override.model,
      apiKey: getApiKey(override.provider),
    };
  }
  return {
    provider: "openai",
    model: defaultModel,
    apiKey: getApiKey("openai"),
  };
}
// Generalized conversation handler - supports different conversation types
export async function handleConversation(
  messages: Message[],
  conversationType: ConversationType = "add_recipient",
  existingData?: RecipientData,
  customSystemPrompt?: string,
  aiOverride?: AIOverride
): Promise<ConversationResponse> {
  const aiConfig = await resolveAIConfig(aiOverride);
  const conversationHistory = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  // Build context info about what we know
  let contextInfo: ContextInfo = {};
  if (existingData) {
    contextInfo = {
      existing_name: existingData.name || null,
      existing_relationship: existingData.relationship_type || null,
      existing_interests: existingData.interests || [],
      existing_birthday: existingData.birthday || null,
      existing_emotional_tone_preference:
        existingData.emotional_tone_preference || null,
      existing_gift_budget_min: existingData.gift_budget_min || null,
      existing_gift_budget_max: existingData.gift_budget_max || null,
      is_update: true,
      conversation_length: messages.length,
      readiness: {
        state: "ready",
        gift_ready: true,
        has_recipient_anchor: true,
        has_occasion_anchor: true,
        has_specificity_anchor: true,
        missing_requirements: [],
        reason: "Existing recipient — already completed intake.",
      },
    };
  } else {
    // Quick context extraction for new recipients
    const quickExtractionPrompt = `CONTEXT ANALYSIS — Extract what we know so far from this conversation and assess gift-readiness.

${conversationHistory}

A recipient should not be judged by conversation length. Do NOT use number of exchanges as a proxy for readiness.

Determine what information is still missing for this recipient to become gift-ready in the current flow.

Mark gift_ready as true only when BeGifted has the minimum information needed to generate 3 non-generic gift concepts for one specific occasion, with a clear rationale, and without obvious mismatch.

A recipient is gift-ready only when ALL of the following are true:

**Recipient anchor:** The conversation identifies the person in a meaningful way. This requires a name or clear person descriptor, plus ANY relationship or connection context. Relationship means any description of how the user relates to this person — family (mom, brother), social (friend, colleague, neighbor), or admiration/fandom (hero, idol, inspiration, mentor, favorite artist). "My guitar hero", "my favorite author", "someone I admire" ALL count as valid relationships.

**Occasion anchor:** The conversation identifies at least one specific giftable moment. Examples: birthday, anniversary, Mother's Day, Father's Day, Christmas, graduation, wedding, new baby, recovery, or another clear occasion/date. If a personal occasion is mentioned without a specific date, the anchor is still satisfied — set needs_occasion_date to true and occasion_needing_date to the occasion name.

**Specificity anchor:** The conversation contains enough information to avoid a generic gift. This requires either one strong signal or two weak signals. If the user explicitly indicates they're unsure or done ("not sure", "skip", "that's all I have"), set user_skipped_specificity to true — this satisfies the anchor.

Strong signals include: specific interests/hobbies/obsessions, aesthetic or style preferences, hard no's/avoid lists/clutter boundaries, favorite brands/artists/authors/teams/cuisines/categories, meaningful life-stage context tied to taste.

Weak signals include: broad interests, approximate age or general life stage, loose personality descriptors, generic other details.

If the conversation only establishes the person and the occasion, but the recipient still feels generic, mark as not gift-ready.

Be accurate, not conservative. If the anchors are clearly satisfied, mark them as true. Only mark an anchor as false if the information is genuinely missing from the conversation.

Return JSON with what's been established:

{
  "name": "person's name if clearly mentioned, null otherwise",
  "relationship": "relationship if established, null otherwise",
  "interests": ["any interests mentioned"],
  "birthday": "birthday if mentioned. Use YYYY-MM-DD only when the year is explicitly stated. If only month and day are known, use MM-DD (e.g. '12-07'). Never substitute placeholder years like 0000 — when in doubt, omit the year. Return null if no birthday is mentioned.",
  "occasions_mentioned": ["array of holidays/occasions mentioned (e.g., 'christmas', 'anniversary', 'kwanzaa')"],
  "needs_occasion_date": false,
  "occasion_needing_date": null,
  "occasions_needing_dates": ["array of occasion names that still require user-provided timing — exclude fixed holidays like Christmas, Valentine's Day, Mother's Day, Father's Day, Thanksgiving, Halloween, Easter, etc."],
  "has_price_guidance": false,
  "price_guidance_raw": "exact quote or paraphrase of price/spend mentioned, null if none",
  "has_age_context": false,
  "age_context_raw": "exact age, grade, stage, or life-stage mentioned (e.g. '17', 'high school senior', 'retired', 'toddler'), null if none — do NOT infer from relationship, hobbies, graduation, or occasion alone",
  "user_skipped_specificity": false,
  "other_details": "brief summary of other key details gathered",
  "readiness": {
    "state": "not_captured | captured_needs_both | captured_needs_occasion | captured_needs_timing | captured_needs_price | captured_needs_age | captured_needs_specificity | ready",
    "gift_ready": false,
    "has_recipient_anchor": false,
    "has_occasion_anchor": false,
    "has_timing_anchor": false,
    "has_price_anchor": false,
    "has_age_anchor": false,
    "has_specificity_anchor": false,
    "missing_requirements": ["recipient_anchor", "occasion_anchor", "timing_anchor", "price_anchor", "age_anchor", "specificity_anchor"],
    "reason": "One-sentence explanation of the assessment"
  },
  "conversation_length": ${messages.length},
  "readiness_score": "0-10 scale (debugging only)"
}`;
    try {
      const contextRaw = await callAI(
        aiConfig.provider,
        aiConfig.model,
        aiConfig.apiKey,
        {
          messages: [{ role: "user", content: quickExtractionPrompt }],
          maxTokens: 500,
          temperature: 0.5,
          jsonMode: true,
        }
      );
      try {
        contextInfo = parseOpenAIJSON(contextRaw);
      } catch (e) {
        console.error("Failed to parse context extraction:", e);
        contextInfo = {
          conversation_length: messages.length,
          readiness_score: 3,
          readiness: {
            state: "not_captured",
            gift_ready: false,
            has_recipient_anchor: false,
            has_occasion_anchor: false,
            has_timing_anchor: false,
            has_price_anchor: false,
            has_age_anchor: false,
            has_specificity_anchor: false,
            missing_requirements: [
              "recipient_anchor",
              "occasion_anchor",
              "timing_anchor",
              "price_anchor",
              "age_anchor",
              "specificity_anchor",
            ],
            reason: "Failed to parse context extraction.",
          },
        };
      }
    } catch (e) {
      console.error("Error in context extraction:", e);
      contextInfo = {
        conversation_length: messages.length,
        readiness_score: 3,
        readiness: {
          state: "not_captured",
          gift_ready: false,
          has_recipient_anchor: false,
          has_occasion_anchor: false,
          has_timing_anchor: false,
          has_price_anchor: false,
          has_age_anchor: false,
          has_specificity_anchor: false,
          missing_requirements: [
            "recipient_anchor",
            "occasion_anchor",
            "timing_anchor",
            "price_anchor",
            "age_anchor",
            "specificity_anchor",
          ],
          reason: "Error in context extraction.",
        },
      };
    }
  }

  // Anchor logic and the deterministic wrap-up are specific to the add_recipient
  // flow. Update flows don't have required anchors — the recipient already
  // exists, so the user decides when to save and the button is always visible.
  if (conversationType === "add_recipient") {
    if (!contextInfo.readiness) {
      contextInfo.readiness = {
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
      };
    }

    const hasName = !!(contextInfo.name || contextInfo.existing_name);
    const hasRelationship = !!(
      contextInfo.relationship || contextInfo.existing_relationship
    );
    contextInfo.readiness.has_recipient_anchor = hasName && hasRelationship;

    const hasOccasion =
      !!(contextInfo.birthday || contextInfo.existing_birthday) ||
      (Array.isArray(contextInfo.occasions_mentioned) &&
        contextInfo.occasions_mentioned.length > 0);
    contextInfo.readiness.has_occasion_anchor = hasOccasion;

    const pendingDates = contextInfo.occasions_needing_dates ?? [];
    const hasTiming =
      !contextInfo.needs_occasion_date && pendingDates.length === 0;
    contextInfo.readiness.has_timing_anchor = hasTiming;

    const hasPrice = !!contextInfo.has_price_guidance;
    contextInfo.readiness.has_price_anchor = hasPrice;

    const hasAge = !!contextInfo.has_age_context;
    contextInfo.readiness.has_age_anchor = hasAge;

    const interestCount = (
      contextInfo.interests ||
      contextInfo.existing_interests ||
      []
    ).length;
    const hasSpecificity =
      interestCount >= 1 || !!contextInfo.user_skipped_specificity;
    contextInfo.readiness.has_specificity_anchor = hasSpecificity;

    if (!contextInfo.readiness.has_recipient_anchor) {
      contextInfo.readiness.state = "not_captured";
    } else if (!hasOccasion) {
      contextInfo.readiness.state = hasSpecificity
        ? "captured_needs_occasion"
        : "captured_needs_both";
    } else if (!hasTiming) {
      contextInfo.readiness.state = "captured_needs_timing";
    } else if (!hasPrice) {
      contextInfo.readiness.state = "captured_needs_price";
    } else if (!hasAge) {
      contextInfo.readiness.state = "captured_needs_age";
    } else if (!hasSpecificity) {
      contextInfo.readiness.state = "captured_needs_specificity";
    } else {
      contextInfo.readiness.state = "ready";
    }

    // If all anchors are satisfied, skip the reply LLM entirely — return a
    // deterministic wrap-up so the message and button are always in sync.
    if (contextInfo.readiness.state === "ready") {
      const wrapUpName =
        contextInfo.name || contextInfo.existing_name || "this person";
      const wrapUpTemplate = await loadActivePrompt(
        supabaseUrl,
        supabaseServiceKey,
        "add_recipient_wrap_up",
        ADD_RECIPIENT_WRAP_UP_DEFAULT
      );
      return {
        reply: wrapUpTemplate.replace(/\{\{recipientName\}\}/g, wrapUpName),
        shouldShowNextStepButton: true,
        conversationContext: contextInfo,
        resolvedSystemPrompt: null,
      };
    }
  }

  // Pre-compute dynamic template content
  const readinessState = contextInfo.readiness?.state ?? "not_captured";
  const recipientName =
    contextInfo.name || contextInfo.existing_name || "this person";
  const stateGuidance = buildStateGuidance(readinessState, recipientName);
  const priorityGuidance = buildPriorityGuidance(contextInfo, recipientName);

  // Interpolate all template variables into a prompt string
  function interpolatePrompt(template: string): string {
    const today = new Date().toISOString().split("T")[0];
    return template
      .replace(/\{\{contextInfo\}\}/g, JSON.stringify(contextInfo, null, 2))
      .replace(/\{\{conversationHistory\}\}/g, conversationHistory)
      .replace(/\{\{messageCount\}\}/g, String(messages.length))
      .replace(/\{\{readinessState\}\}/g, readinessState)
      .replace(/\{\{stateGuidance\}\}/g, stateGuidance)
      .replace(/\{\{priorityGuidance\}\}/g, priorityGuidance)
      .replace(/\{\{recipientName\}\}/g, recipientName)
      .replace(/\{\{today\}\}/g, today);
  }

  // Build conversation prompt based on conversation type
  let systemPrompt = "";
  switch (conversationType) {
    case "add_recipient": {
      if (customSystemPrompt) {
        // Playground testing — interpolate template variables into custom prompt
        systemPrompt = interpolatePrompt(customSystemPrompt);
      } else {
        // Production — load from DB, fall back to hardcoded default template
        const dbPrompt = await loadActivePrompt(
          supabaseUrl,
          supabaseServiceKey,
          "add_recipient_conversation",
          ADD_RECIPIENT_DEFAULT_TEMPLATE
        );
        systemPrompt = interpolatePrompt(dbPrompt);
      }
      break;
    }
    case "update_field":
    case "extract_interests":
      systemPrompt = buildUpdateFieldPrompt(
        contextInfo,
        conversationHistory,
        messages.length,
        "interests"
      );
      break;
    case "extract_preferences":
      systemPrompt = buildUpdateFieldPrompt(
        contextInfo,
        conversationHistory,
        messages.length,
        "preferences"
      );
      break;
    case "extract_birthday":
      systemPrompt = buildUpdateFieldPrompt(
        contextInfo,
        conversationHistory,
        messages.length,
        "birthday"
      );
      break;
    case "extract_address":
      systemPrompt = buildUpdateFieldPrompt(
        contextInfo,
        conversationHistory,
        messages.length,
        "address"
      );
      break;
    default:
      systemPrompt = interpolatePrompt(ADD_RECIPIENT_DEFAULT_TEMPLATE);
  }
  let reply = await callAI(aiConfig.provider, aiConfig.model, aiConfig.apiKey, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Please respond to continue the conversation." },
    ],
    maxTokens: 300,
    temperature: 0.7,
  });

  // Guard: if the LLM returned a JSON object instead of plain text, extract the
  // reply field so we never display raw JSON to the user.
  const trimmed = reply.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = parseOpenAIJSON(trimmed);
      if (typeof parsed.reply === "string") {
        reply = parsed.reply;
      }
    } catch {
      // Not valid JSON — use the raw text as-is
    }
  }

  // For add_recipient, anchors weren't all satisfied yet — button stays hidden
  // until the wrap-up branch above fires. For every other conversation type
  // (update_field, extract_*) the recipient already exists, so the user can
  // save at any point.
  return {
    reply,
    shouldShowNextStepButton: conversationType !== "add_recipient",
    conversationContext: contextInfo,
    resolvedSystemPrompt: systemPrompt,
  };
}
// --- Helpers for pre-computing dynamic template content ---

function buildStateGuidance(
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

function buildPriorityGuidance(
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
const ADD_RECIPIENT_WRAP_UP_DEFAULT = `Got it — I have what I need. I'll take it from here and start pulling together a few gift ideas for {{recipientName}}.`;

// Default template for add_recipient_conversation — single source of truth.
// This matches the structure previously hardcoded in buildAddRecipientPrompt().
const ADD_RECIPIENT_DEFAULT_TEMPLATE = `IMPORTANT: Respond with plain text only. Do NOT return JSON, code blocks, or structured data.

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
function buildUpdateFieldPrompt(
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
async function addBirthdayAsOccasion(
  extractedData: ExtractedData
): Promise<void> {
  const raw = extractedData.birthday;
  if (!raw) return;

  // Accept three forms: "YYYY-MM-DD", "MM-DD", or "--MM-DD" (vCard partial
  // date when birth year is unknown). All collapse to a month/day pair here.
  const noYear = /^--(\d{2})-(\d{2})$/.exec(raw);
  const parts = noYear
    ? [noYear[1], noYear[2]]
    : raw.split("-").filter((p) => p.length > 0);
  if (parts.length < 2) return;

  const month = parseInt(parts[parts.length === 3 ? 1 : 0], 10);
  const day = parseInt(parts[parts.length === 3 ? 2 : 1], 10);
  const validMonthDay =
    !isNaN(month) &&
    !isNaN(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31;
  if (!validMonthDay) return;

  const { getNextOccurrenceDate } = await import("./utils.ts");
  const nextBirthdayDate = getNextOccurrenceDate(month, day);

  const birthdayExists = extractedData.occasions?.some(
    (occ: { date: string; occasion_type: string }) =>
      occ.occasion_type === "birthday" && occ.date === nextBirthdayDate
  );
  if (birthdayExists) return;

  if (!extractedData.occasions) {
    extractedData.occasions = [];
  }
  extractedData.occasions.push({
    date: nextBirthdayDate,
    occasion_type: "birthday",
  });
}

// A single-anchor amount (e.g. "around $150") should yield a usable range so
// gift generation isn't pinned to one exact price. If extraction still
// collapses min === max, expand it around the anchor (0.8x–1.25x, snapped to
// $5). Also coerces string/"null" values to numbers. DEV-100.
// Operates only on freshly-extracted output — it never touches stored data.
function normalizeBudgetRange(data: {
  gift_budget_min?: number | string | null;
  gift_budget_max?: number | string | null;
}): void {
  const toNumber = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "" || v === "null") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const min = toNumber(data.gift_budget_min);
  const max = toNumber(data.gift_budget_max);

  // Persist coerced numeric values (or null) back onto the object.
  if ("gift_budget_min" in data) data.gift_budget_min = min;
  if ("gift_budget_max" in data) data.gift_budget_max = max;

  // Only intervene on a collapsed single anchor: both set, equal, positive.
  if (min === null || max === null || min !== max || min <= 0) return;

  const anchor = min;
  data.gift_budget_min = Math.floor((anchor * 0.8) / 5) * 5;
  data.gift_budget_max = Math.ceil((anchor * 1.25) / 5) * 5;
  console.log(
    `Budget collapsed to single value ${anchor}; expanded to ${data.gift_budget_min}-${data.gift_budget_max}`
  );
}

// Full recipient extraction (for adding new recipients)
export async function extractFullRecipient(
  messages: Message[],
  aiOverride?: AIOverride
): Promise<ExtractionResponse> {
  const aiConfig = await resolveAIConfig(aiOverride);
  console.log("=== FULL RECIPIENT EXTRACTION ===");
  console.log("Total messages:", messages.length);
  const conversationHistory = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  console.log("Full conversation being analyzed:", conversationHistory);
  // PASS 1: Critical fields extraction
  const criticalFieldsPrompt = `EXTRACT NAME AND RELATIONSHIP - This is the most important task.

Analyze this conversation and extract ONLY the recipient's name and the user's relationship to them:

${conversationHistory}

Look for these patterns:
- "my [relationship] [name]" → relationship + name
- "[Name] is my [relationship]" → name + relationship  
- "This is for my [relationship]" → relationship
- "Her/his name is [name]" → name
- Any mention of a person's name in context of gift-giving
- Any relationship words: mom, dad, mother, father, sister, brother, friend, wife, husband, partner, colleague, etc.

CRITICAL: Be aggressive in extraction. If you see ANY indication of a name or relationship, include it.

Return ONLY valid JSON (no markdown formatting):
{
  "name": "exact name found or null",
  "relationship_type": "exact relationship found or null"
}`;
  console.log("🔍 PASS 1: Extracting critical fields...");
  const criticalRaw = await callAI(
    aiConfig.provider,
    aiConfig.model,
    aiConfig.apiKey,
    {
      messages: [{ role: "user", content: criticalFieldsPrompt }],
      maxTokens: 150,
      temperature: 0.3,
      jsonMode: true,
    }
  );
  console.log("Critical fields raw response:", criticalRaw);
  let criticalFields;
  try {
    criticalFields = parseOpenAIJSON(criticalRaw);
    console.log("✅ Successfully parsed critical fields:", criticalFields);
  } catch (e) {
    console.error("❌ Failed to parse critical fields, using fallback:", e);
    criticalFields = {
      name: null,
      relationship_type: null,
    };
  }
  // PASS 2: Full extraction with critical fields as context
  const fullExtractionPrompt = `COMPREHENSIVE RECIPIENT DATA EXTRACTION

Based on this conversation, extract all available information about the gift recipient.

PRIORITY FIELDS (use these if found): 
- Name: "${criticalFields.name}"
- Relationship: "${criticalFields.relationship_type}"

Conversation:
${conversationHistory}

Look for birthday mentions like: "her birthday is...", "she was born on...", "he turns [age] on..."
Look for holidays, occasions, and special events like: "we celebrate Christmas", "Mother's Day", "anniversaries", "Valentine's Day", "New Year's", "Spring Equinox", "Autumn Equinox", "our anniversary", or any other special dates mentioned.

Extract and return valid JSON (no markdown formatting) with this exact structure:
{
  "name": "${criticalFields.name || "null"}",
  "relationship_type": "${criticalFields.relationship_type || "null"}",
  "birthday": "Birthday or null. Use YYYY-MM-DD only when the year is explicit; use MM-DD when only month and day are known. Never use placeholder years like 0000.",
  "age": "The recipient's CURRENT age in whole years as a number, but ONLY when the user explicitly states it (e.g. \"he's 47\", \"she just turned 30\", \"my 8 year old\"). Do NOT infer age from relationship, life stage, grade, graduation, hobbies, or occasion. null if not explicitly stated.",
  "interests": ["array of interests the recipient LIKES / is into, as expressed in this conversation"],
  "interests_removed": ["array of interests the user says the recipient is NO LONGER into, dislikes, or wants removed (e.g. \"not into pokemon anymore\", \"she's over hiking\"). Use the same wording the user/recipient used for the dropped interest. Empty array if no interest was dropped — never put a newly-liked interest here."],
  "gift_budget_min": "Lower end of the gift budget range as a number, or null. RULES: (a) explicit range like \"$50-$75\" -> 50. (b) single anchor like \"around $150\"/\"$150\" -> about 0.8x the anchor (e.g. 120). (c) upper-limit only like \"under $150\"/\"up to $250\" -> null. (d) vague answer like \"flexible\"/\"nothing too expensive\" -> null. NEVER set min equal to max for a single anchor; a single amount must become a range.",
  "gift_budget_max": "Upper end of the gift budget range as a number, or null. RULES: (a) explicit range like \"$50-$75\" -> 75. (b) single anchor like \"around $150\"/\"$150\" -> about 1.25x the anchor (e.g. 190). (c) upper-limit only like \"under $150\"/\"up to $250\" -> that number (150 / 250). (d) vague answer -> null.",
  "emotional_tone_preference": "string or null",
  "knownRoles": "Array of life roles the recipient EXPLICITLY plays, drawn only from clear conversational signals — e.g. ['mother'] when the user says they have kids together / mentions the recipient's child, ['father'], ['grandmother'], ['grandfather']. CRITICAL: do NOT infer 'mother'/'father' from spouse/partner/wife/husband status alone — only when the conversation makes parenthood explicit (their child, 'we have kids', 'mom of three', etc.). Empty array [] if no role is clearly stated.",
  "householdContext": "Short phrase describing the recipient's household when explicitly mentioned — e.g. 'shares a household with the user and their two children'. null if not stated. Do not infer children or a shared household from spouse/partner status alone.",
  "address": "string or null",
  "address_line_2": "string or null",
  "city": "string or null",
  "state": "string or null",
  "zip_code": "string or null",
  "country": "string or null",
  "occasions": [
    {
      "date": "YYYY-MM-DD or null (extract date if mentioned in conversation, otherwise null)",
      "occasion_type": "lowercase_with_underscores (e.g., 'christmas', 'anniversary', 'spring_equinox', 'new_years', 'autumn_equinox')"
    }
  ],
  "confidence_score": "number 0-1 (use 0.9+ if name and relationship are clear)"
}

IMPORTANT: 
- Extract ALL occasions mentioned (holidays, anniversaries, equinoxes, solstices, personal events, etc.)
- If a date is mentioned with the occasion (e.g., "our anniversary is June 15"), extract it in YYYY-MM-DD format
- If no date is mentioned, set date to null - we'll calculate it later
- Use descriptive occasion_type names (e.g., "anniversary", "spring_equinox", "new_years", "christmas")
- If the priority fields have values, use them exactly as provided above.`;
  console.log("🔍 PASS 2: Full extraction with context...");
  const fullRaw = await callAI(
    aiConfig.provider,
    aiConfig.model,
    aiConfig.apiKey,
    {
      messages: [{ role: "user", content: fullExtractionPrompt }],
      maxTokens: 500,
      temperature: 0.3,
      jsonMode: true,
    }
  );
  console.log("Full extraction raw response:", fullRaw);
  let extractedData;
  try {
    extractedData = parseOpenAIJSON(fullRaw);
    console.log("✅ Successfully parsed full extraction:", extractedData);
  } catch (e) {
    console.error(
      "❌ Failed to parse full extraction, using fallback with critical fields:",
      e
    );
    extractedData = {
      name: criticalFields.name || undefined,
      relationship_type: criticalFields.relationship_type || undefined,
      birthday: undefined,
      interests: [],
      interests_removed: [],
      gift_budget_min: undefined,
      gift_budget_max: undefined,
      emotional_tone_preference: undefined,
      confidence_score:
        criticalFields.name && criticalFields.relationship_type ? 0.8 : 0.3,
    };
  }
  // Final validation and enhancement
  if (criticalFields.name && !extractedData.name) {
    extractedData.name = criticalFields.name;
  }
  if (criticalFields.relationship_type && !extractedData.relationship_type) {
    extractedData.relationship_type = criticalFields.relationship_type;
  }

  // Expand a collapsed single-anchor budget into a usable range. DEV-100.
  normalizeBudgetRange(extractedData);

  // Coerce a user-stated age to a positive number or null (DEV-105). Only an
  // explicit age should reach here; the client turns it into a birth year so
  // the synopsis can derive age instead of letting the LLM guess.
  if (extractedData.age != null) {
    const n = Number(extractedData.age);
    extractedData.age = Number.isFinite(n) && n > 0 ? n : null;
  }

  // Process occasions - fill in missing dates using holiday lookup
  if (extractedData.occasions && Array.isArray(extractedData.occasions)) {
    const { convertHolidaysToOccasions } = await import("./utils.ts");

    for (const occasion of extractedData.occasions) {
      const dateMissing =
        !occasion.date || occasion.date === "null" || occasion.date === null;
      if (!dateMissing) continue;

      const holidayOccasions = convertHolidaysToOccasions([
        occasion.occasion_type,
      ]);

      if (holidayOccasions.length > 0 && holidayOccasions[0].date) {
        occasion.date = holidayOccasions[0].date;
        continue;
      }

      // Unknown occasion — placeholder Jan 1 of next year; user can edit in UI.
      const nextYear = new Date().getFullYear() + 1;
      occasion.date = `${nextYear}-01-01`;
      console.warn(
        `Unknown occasion "${occasion.occasion_type}" - using placeholder date ${occasion.date}`
      );
    }
  } else if (!extractedData.occasions) {
    extractedData.occasions = [];
  }

  if (extractedData.birthday) {
    await addBirthdayAsOccasion(extractedData);
  }
  console.log("🎯 FINAL EXTRACTION RESULTS:", {
    name: extractedData.name ? "✅ FOUND" : "❌ MISSING",
    nameValue: extractedData.name,
    relationship: extractedData.relationship_type ? "✅ FOUND" : "❌ MISSING",
    relationshipValue: extractedData.relationship_type,
    hasRequiredFields: !!(
      extractedData.name && extractedData.relationship_type
    ),
    confidence_score: extractedData.confidence_score,
    interests_count: extractedData.interests?.length || 0,
  });
  console.log("=== END FULL EXTRACTION ===");
  return {
    extractedData,
  };
}
// Partial extraction for specific fields (for updating recipients)
// Line 554: extractFields
export async function extractFields(
  messages: Message[],
  targetFields: string[],
  existingData?: RecipientData,
  aiOverride?: AIOverride
): Promise<ExtractionResponse> {
  const aiConfig = await resolveAIConfig(aiOverride);
  console.log("=== PARTIAL FIELD EXTRACTION ===");
  console.log("Target fields:", targetFields);
  console.log("Existing data:", existingData);
  const conversationHistory = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  // Build extraction prompt for specific fields
  const existingContext = existingData?.name
    ? `We're updating information for ${existingData.name}. `
    : "We're updating recipient information. ";
  const fieldsDescription = targetFields
    .map((field) => {
      switch (field) {
        case "interests":
          return `"interests": ["array of interests mentioned or updated"]`;
        case "gift_budget_min":
          return `"gift_budget_min": "Lower end of the gift budget range as a number, or null. Explicit range \"$50-$75\" -> 50. Single anchor \"around $150\" -> about 0.8x (e.g. 120). Upper-limit only \"under $150\" -> null. Vague \"flexible\" -> null. Never set min equal to max for a single anchor."`;
        case "gift_budget_max":
          return `"gift_budget_max": "Upper end of the gift budget range as a number, or null. Explicit range \"$50-$75\" -> 75. Single anchor \"around $150\" -> about 1.25x (e.g. 190). Upper-limit only \"under $150\"/\"up to $250\" -> that number. Vague -> null."`;
        case "birthday":
          return `"birthday": "YYYY-MM-DD when year is explicit, MM-DD when only month and day are known, or null. Never use placeholder years like 0000."`;
        case "emotional_tone_preference":
          return `"emotional_tone_preference": "string or null"`;
        case "address":
          return `"address": "string or null"`;
        case "city":
          return `"city": "string or null"`;
        case "state":
          return `"state": "string or null"`;
        case "zip_code":
          return `"zip_code": "string or null"`;
        default:
          return `"${field}": "value or null"`;
      }
    })
    .join(",\n  ");
  const currentValues = existingData
    ? `
  
CURRENT VALUES:
${Object.entries(existingData)
  .filter(([key]) => targetFields.includes(key))
  .map(([key, value]) => `- ${key}: ${value || "not set"}`)
  .join("\n")}`
    : "";
  const extractionPrompt = `EXTRACT SPECIFIC FIELDS FROM CONVERSATION

${existingContext}Extract only the following fields from this conversation:

${conversationHistory}${currentValues}

Return ONLY valid JSON (no markdown formatting) with these fields:
{
  ${fieldsDescription}
}

Only include the requested fields. If a field wasn't mentioned, set it to null.`;
  console.log("🔍 Extracting fields:", targetFields);
  const fieldsRaw = await callAI(
    aiConfig.provider,
    aiConfig.model,
    aiConfig.apiKey,
    {
      messages: [{ role: "user", content: extractionPrompt }],
      maxTokens: 300,
      temperature: 0.3,
      jsonMode: true,
    }
  );
  console.log("Field extraction raw response:", fieldsRaw);
  let extractedData;
  try {
    extractedData = parseOpenAIJSON(fieldsRaw);
    console.log("✅ Successfully parsed field extraction:", extractedData);
  } catch (e) {
    console.error("❌ Failed to parse field extraction:", e);
    // Return empty object if parsing fails
    extractedData = {};
  }
  // Expand a collapsed single-anchor budget into a usable range. DEV-100.
  normalizeBudgetRange(extractedData);
  console.log("=== END PARTIAL EXTRACTION ===");
  return {
    extractedData,
  };
}
// Single field extraction (convenience wrapper)
// Line 660: extractField
export async function extractField(
  messages: Message[],
  field: string,
  existingData?: RecipientData,
  aiOverride?: AIOverride
): Promise<ExtractionResponse> {
  return extractFields(messages, [field], existingData, aiOverride);
}

// Occasion recommendation types for suggest-occasions-from-interests
export interface OccasionRecommendation {
  type: string;
  name: string;
  suggestedDate: string | null;
  isMilestone: boolean;
  reasoning: string;
}

export interface OccasionRecommendations {
  primaryOccasions: OccasionRecommendation[];
  additionalSuggestions: string[];
}

/**
 * Best-effort inference of life roles from a free-form relationship_type
 * string. Only covers the unambiguous parent/grandparent vocabulary so the
 * occasion prompt can unlock Mother's/Father's Day for the obvious cases
 * without waiting on richer profile capture. Spouse/sibling/etc. are
 * intentionally not inferred — they don't change the marquee occasions and
 * the LLM already handles them from `relationship` alone.
 */
function inferRolesFromRelationship(relationship: string): string[] {
  const r = relationship.toLowerCase();
  const roles = new Set<string>();
  if (/\b(mom|mother|mama|mommy|mum)\b/.test(r)) roles.add("mother");
  if (/\b(grandmother|grandma|grammy|granny|nana)\b/.test(r)) {
    roles.add("mother");
    roles.add("grandmother");
  }
  if (/\b(dad|father|papa|daddy)\b/.test(r)) roles.add("father");
  if (/\b(grandfather|grandpa|grampy)\b/.test(r)) {
    roles.add("father");
    roles.add("grandfather");
  }
  return [...roles];
}

/**
 * Canonicalize common relationship nicknames to a consistent vocabulary before
 * the occasion prompt sees them (e.g. "hubby" → "husband", "mom" → "mother"),
 * so the model reasons from a stable set of terms. Only an exact match of the
 * whole (trimmed, lowercased) relationship is rewritten — phrases like "college
 * roommate" and already-canonical terms pass through unchanged, so no nuance is
 * lost (DEV-160).
 */
const RELATIONSHIP_SYNONYMS: Record<string, string> = {
  hubby: "husband",
  wifey: "wife",
  mom: "mother",
  mum: "mother",
  mommy: "mother",
  mama: "mother",
  dad: "father",
  daddy: "father",
  papa: "father",
  grandma: "grandmother",
  granny: "grandmother",
  nana: "grandmother",
  grandpa: "grandfather",
  grampa: "grandfather",
  gramps: "grandfather",
  sis: "sister",
  bro: "brother",
  gf: "girlfriend",
  bf: "boyfriend",
  "significant other": "partner",
  bestie: "best friend",
  bff: "best friend",
};

function normalizeRelationship(relationship: string): string {
  const trimmed = relationship.trim();
  return RELATIONSHIP_SYNONYMS[trimmed.toLowerCase()] ?? trimmed;
}

/**
 * Recommend occasions based on the recipient's interests, relationship, and birthday.
 * Leans into hobbies and interests (e.g. running → race day, music → Record Store Day).
 */
export async function recommendOccasions(
  extractedData: ExtractedData | RecipientData,
  customSystemPrompt?: string,
  aiOverride?: AIOverride
): Promise<OccasionRecommendations> {
  const aiConfig = await resolveAIConfig(aiOverride, "gpt-5.4-mini");
  const name = extractedData.name || "this person";
  const relationship = normalizeRelationship(
    extractedData.relationship_type || ""
  );
  const birthday = extractedData.birthday || null;
  const interests =
    (extractedData as ExtractedData).interests ||
    (extractedData as RecipientData).interests ||
    [];
  const explicitKnownRoles =
    (extractedData as ExtractedData).knownRoles ||
    (extractedData as RecipientData).knownRoles ||
    [];
  const knownRoles =
    explicitKnownRoles.length > 0
      ? explicitKnownRoles
      : inferRolesFromRelationship(relationship);
  const householdContext =
    (extractedData as ExtractedData).householdContext ||
    (extractedData as RecipientData).householdContext ||
    "";
  const importantDates =
    (extractedData as ExtractedData).importantDates ||
    (extractedData as RecipientData).importantDates ||
    [];
  const explicitKnownOccasions =
    (extractedData as ExtractedData).knownOccasions ||
    (extractedData as RecipientData).knownOccasions ||
    [];
  // Fall back to the recipient's already-captured occasions as known
  // occasions so the prompt can use (and avoid re-suggesting) them.
  const trackedOccasions = (extractedData as ExtractedData).occasions || [];
  const knownOccasions =
    explicitKnownOccasions.length > 0
      ? explicitKnownOccasions
      : trackedOccasions
          .filter((o) => o.occasion_type && o.occasion_type !== "birthday")
          .map((o) =>
            o.date ? `${o.occasion_type} (${o.date})` : o.occasion_type
          );
  const culturalContext =
    (extractedData as ExtractedData).culturalContext ||
    (extractedData as RecipientData).culturalContext ||
    "";

  const today = new Date().toISOString().split("T")[0];
  const birthdayStr = birthday ? `- Birthday: ${birthday}` : "";
  const interestsStr =
    interests.length > 0
      ? `- Interests: ${interests.join(", ")}`
      : "- Interests: (none specified)";
  const knownRolesStr =
    knownRoles.length > 0 ? `- Known roles: ${knownRoles.join(", ")}` : "";
  const householdContextStr = householdContext
    ? `- Household context: ${householdContext}`
    : "";
  const importantDatesStr =
    importantDates.length > 0
      ? `- Important dates: ${importantDates.join(", ")}`
      : "";
  const knownOccasionsStr =
    knownOccasions.length > 0
      ? `- Known occasions: ${knownOccasions.join(", ")}`
      : "";
  const culturalContextStr = culturalContext
    ? `- Cultural context: ${culturalContext}`
    : "";

  // Build the prompt — custom > DB > hardcoded fallback
  const hardcodedFallback = `You are a gift-planning assistant. Suggest ONLY real, verifiable occasions—no invented or creative-but-fake ones.

NO HALLUCINATION: Every primaryOccasion MUST be a real observance day, official holiday, or the recipient's birthday. Do NOT invent occasions (e.g. no "Skateboarding video release day", "Hair dye experimentation day", or similar). If you are not certain an occasion exists on an official or widely recognized calendar (national/international observance, public holiday), do not include it. Prefer fewer, real occasions over more, made-up ones.

TODAY'S DATE (all suggestedDate values must be on or after this date): {{today}}

RECIPIENT:
- Name: {{name}}
- Relationship: {{relationship}}
{{birthday}}
{{knownRoles}}
{{householdContext}}
{{interests}}

ALLOWED SOURCES (only these):
- Birthday (use their next upcoming birthday date).
- Official or widely recognized national/international observance days, e.g.: National Bird Day (Jan 5), National BBQ Day (May 16), National Country Music Day (Sep 17), Record Store Day (3rd Saturday in April), National Running Day (1st Wed in June), Earth Day (Apr 22), etc.
- Major holidays: Christmas, Thanksgiving, New Year's Day, Valentine's Day, Mother's Day, Father's Day, Halloween, etc.
Do not suggest fictional, invented, or "creative" occasions that are not real calendar events.

RULES:
- DATES MUST BE IN THE FUTURE: suggestedDate must be today or a future date (YYYY-MM-DD). Use the next occurrence for annual events. For birthday, use next upcoming birthday. Never use past years.
- Include birthday if provided; for ages 30, 40, 50, etc. set isMilestone true.
- type: lowercase snake_case, one of: birthday, major_gifting_holiday, relationship_based_occasion, interest_based_observance. Put the specific occasion in "name" (e.g. type "interest_based_observance", name "Record Store Day").
- reasoning: one short sentence tying the occasion to their interests (only for real occasions).

Return JSON only, no markdown:
{
  "primaryOccasions": [
    {
      "type": "birthday | major_gifting_holiday | relationship_based_occasion | interest_based_observance",
      "name": "Human-readable name",
      "suggestedDate": "YYYY-MM-DD or null",
      "isMilestone": false,
      "reasoning": "Why this fits their interests"
    }
  ],
  "additionalSuggestions": ["Real holiday/observance names only"]
}`;

  let promptTemplate: string;
  if (customSystemPrompt) {
    promptTemplate = customSystemPrompt;
  } else {
    promptTemplate = await loadActivePrompt(
      supabaseUrl,
      supabaseServiceKey,
      "occasion_recommendations",
      hardcodedFallback
    );
  }

  const prompt = promptTemplate
    .replace("{{today}}", today)
    .replace("{{name}}", name)
    .replace("{{relationship}}", relationship)
    .replace("{{birthday}}", birthdayStr)
    .replace("{{knownRoles}}", knownRolesStr)
    .replace("{{householdContext}}", householdContextStr)
    .replace("{{importantDates}}", importantDatesStr)
    .replace("{{knownOccasions}}", knownOccasionsStr)
    .replace("{{culturalContext}}", culturalContextStr)
    .replace("{{interests}}", interestsStr);

  let occasionsRaw: string;
  try {
    occasionsRaw = await callAI(
      aiConfig.provider,
      aiConfig.model,
      aiConfig.apiKey,
      {
        messages: [{ role: "user", content: prompt }],
        maxTokens: 900,
        temperature: 0.75,
        jsonMode: true,
      }
    );
  } catch (err) {
    console.error("recommendOccasions AI error:", err);
    return getFallbackOccasionRecommendations(birthday);
  }

  try {
    const parsed = parseOpenAIJSON(occasionsRaw);
    const primary = Array.isArray(parsed.primaryOccasions)
      ? parsed.primaryOccasions
      : [];
    const additional = Array.isArray(parsed.additionalSuggestions)
      ? parsed.additionalSuggestions
      : [];
    return {
      primaryOccasions: primary.map((o: any) => ({
        type: String(o.type || "custom")
          .replace(/\s+/g, "_")
          .toLowerCase(),
        name: String(o.name || o.type || "Occasion"),
        suggestedDate: o.suggestedDate ?? null,
        isMilestone: Boolean(o.isMilestone),
        reasoning: String(o.reasoning || ""),
      })),
      additionalSuggestions: additional.map((s: any) => String(s)),
    };
  } catch (e) {
    console.error("recommendOccasions parse error:", e);
    return getFallbackOccasionRecommendations(birthday);
  }
}

function getFallbackOccasionRecommendations(
  birthday: string | null
): OccasionRecommendations {
  const primary: OccasionRecommendation[] = [];
  if (birthday) {
    primary.push({
      type: "birthday",
      name: "Birthday",
      suggestedDate: birthday,
      isMilestone: false,
      reasoning: "Everyone deserves to feel special on their birthday.",
    });
  }
  return {
    primaryOccasions: primary,
    additionalSuggestions: ["Christmas", "New Year", "Thanksgiving"],
  };
}
