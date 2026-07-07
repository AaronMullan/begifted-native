import { loadActivePrompt } from "../_shared/prompt-loader.ts";
import { type Provider, type AIOverride } from "../_shared/ai-config-loader.ts";
import { callAI, getApiKey, CONVERSATION_MODEL } from "../_shared/ai-client.ts";
import type {
  ContextInfo,
  ConversationResponse,
  ConversationType,
  Message,
  RecipientData,
} from "../types.ts";
import { parseOpenAIJSON } from "./utils.ts";
import {
  buildStateGuidance,
  buildPriorityGuidance,
  buildUpdateFieldPrompt,
  ADD_RECIPIENT_WRAP_UP_DEFAULT,
  ADD_RECIPIENT_DEFAULT_TEMPLATE,
} from "./prompts.ts";
// @ts-ignore - Deno environment variables are resolved at runtime
export const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
// @ts-ignore - Deno environment variables are resolved at runtime
export const supabaseServiceKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export type AIConfig = { provider: Provider; model: string; apiKey: string };

export async function resolveAIConfig(
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
