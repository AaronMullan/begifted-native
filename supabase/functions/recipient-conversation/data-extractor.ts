import { loadActivePrompt } from "../_shared/prompt-loader.ts";
import { type Provider, type AIOverride } from "../_shared/ai-config-loader.ts";
import {
  callAI,
  getApiKey,
  CONVERSATION_MODEL,
  AIRefusalError,
} from "../_shared/ai-client.ts";
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
  ADD_RECIPIENT_EXTRACTION_DEFAULT,
  interpolateExtractionPrompt,
  SAFETY_PREAMBLE,
  isPreambleDecline,
} from "./prompts.ts";
import { deriveAddRecipientReadiness } from "./readiness.ts";
import {
  DEFAULT_INTAKE_RULES,
  parseIntakeRules,
  renderRequiredFields,
} from "./intake-rules.ts";
import type { IntakeRules } from "./intake-rules.ts";
import { stripAllSetCompletion, stripQuestions } from "./completion.ts";
// @ts-ignore - Deno environment variables are resolved at runtime
export const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
// @ts-ignore - Deno environment variables are resolved at runtime
export const supabaseServiceKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// How long a Playground deploy of the extractor prompt can take to reach a
// warm isolate.
const EXTRACTION_TEMPLATE_TTL_MS = 60_000;
let extractionTemplateCache: { text: string; loadedAt: number } | null = null;

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
  aiOverride?: AIOverride,
  customIntakeRules?: IntakeRules,
  customExtractionPrompt?: string
): Promise<ConversationResponse> {
  const turnStartedAt = Date.now();
  const timings: Record<string, number> = {};
  // Every exit path logs one line so a slow turn in the log stream can be
  // attributed to a stage (extraction vs prompt load vs reply) at a glance.
  const finishTimings = (readinessState: string) => {
    timings.total_ms = Date.now() - turnStartedAt;
    console.log(
      JSON.stringify({
        tag: "turn_timing",
        conversationType,
        readiness: readinessState,
        ...timings,
      })
    );
    return timings;
  };
  const aiConfig = await resolveAIConfig(aiOverride);
  const conversationHistory = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  // The prompt rows don't depend on the extraction result, so their round
  // trips overlap the model call instead of adding to it. loadActivePrompt
  // never rejects (it falls back internally), so a promise left un-awaited on
  // a path that doesn't use it can't surface as an unhandled rejection.
  const timedLoad = (key: string, fallback: string, timingKey: string) => {
    const startedAt = Date.now();
    return loadActivePrompt(
      supabaseUrl,
      supabaseServiceKey,
      key,
      fallback
    ).then((text) => {
      timings[timingKey] = Date.now() - startedAt;
      return text;
    });
  };
  const wrapUpTemplatePromise =
    conversationType === "add_recipient"
      ? timedLoad(
          "add_recipient_wrap_up",
          ADD_RECIPIENT_WRAP_UP_DEFAULT,
          "wrap_up_prompt_load_ms"
        )
      : null;
  const conversationTemplatePromise =
    conversationType === "add_recipient" && !customSystemPrompt
      ? timedLoad(
          "add_recipient_conversation",
          ADD_RECIPIENT_DEFAULT_TEMPLATE,
          "prompt_load_ms"
        )
      : null;
  // The extraction call can't start until its prompt is in hand, so unlike
  // the loads above this one would add a full round trip to every turn; a
  // per-isolate cache keeps that off all but the first turn in each window.
  // An active row without the transcript would have the extractor judge an
  // empty conversation on every turn, so it falls back to the default instead.
  const extractionTemplatePromise: Promise<string> | null = existingData
    ? null
    : customExtractionPrompt
      ? Promise.resolve(customExtractionPrompt)
      : extractionTemplateCache &&
          Date.now() - extractionTemplateCache.loadedAt <
            EXTRACTION_TEMPLATE_TTL_MS
        ? Promise.resolve(extractionTemplateCache.text)
        : timedLoad(
            "add_recipient_extraction",
            "",
            "extraction_prompt_load_ms"
          ).then((loaded) => {
            // No row loaded: a failed query, or the gap mid-deploy when no
            // version is active. Not cached, so the next turn retries rather
            // than pinning the default over a version an admin just activated.
            if (!loaded) return ADD_RECIPIENT_EXTRACTION_DEFAULT;
            const text = loaded.includes("{{conversationHistory}}")
              ? loaded
              : ADD_RECIPIENT_EXTRACTION_DEFAULT;
            if (text !== loaded) {
              console.error(
                JSON.stringify({ tag: "extraction_prompt_missing_history" })
              );
            }
            extractionTemplateCache = { text, loadedAt: Date.now() };
            return text;
          });
  // A draft from the Playground arrives already validated. An invalid active
  // row must not break intake for everyone, so it falls back to the defaults
  // and logs loudly instead.
  const intakeRulesPromise: Promise<IntakeRules> | null =
    conversationType !== "add_recipient"
      ? null
      : customIntakeRules
        ? Promise.resolve(customIntakeRules)
        : timedLoad("add_recipient_rules", "", "rules_load_ms").then((text) => {
            if (!text) return DEFAULT_INTAKE_RULES;
            const parsed = parseIntakeRules(text);
            if (parsed.ok) return parsed.rules;
            console.error(
              JSON.stringify({
                tag: "intake_rules_invalid",
                errors: parsed.errors,
              })
            );
            return DEFAULT_INTAKE_RULES;
          });
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
        has_timing_anchor: true,
        has_price_anchor: true,
        has_age_anchor: true,
        has_specificity_anchor: true,
        missing_requirements: [],
        reason: "Existing recipient — already completed intake.",
      },
    };
  } else {
    // Quick context extraction for new recipients
    const quickExtractionPrompt = interpolateExtractionPrompt(
      (await extractionTemplatePromise) ?? ADD_RECIPIENT_EXTRACTION_DEFAULT,
      conversationHistory
    );
    const extractionStartedAt = Date.now();
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
      timings.context_extraction_ms = Date.now() - extractionStartedAt;
      try {
        contextInfo = parseOpenAIJSON(contextRaw);
        contextInfo.conversation_length = messages.length;
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
      // A refusal must reach the top-level safety handler, not be masked by the
      // synthetic "not_captured" context below (which would let the flow
      // continue as if the user had simply said nothing).
      if (e instanceof AIRefusalError) throw e;
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
  let textureNeedsFollowup = false;
  // When the ready turn carries a meaningful final answer, we fall through to the
  // reply LLM for its recognition sentence but still append this fixed close so
  // completion copy stays consistent. Null on every non-acknowledgment path.
  let readyAcknowledgmentClose: string | null = null;
  const intakeRules = (await intakeRulesPromise) ?? DEFAULT_INTAKE_RULES;
  if (conversationType === "add_recipient") {
    // The extractor is not asked for a readiness block: the runtime is the
    // single source for every anchor and the state, and generating the block
    // costs ~130 output tokens on the slowest call of the turn. The block is
    // assembled here instead so contextInfo keeps its shape for the reply
    // prompt and the playground.
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

    const assistantTurns = messages.filter(
      (m) => m.role === "assistant"
    ).length;
    const derived = deriveAddRecipientReadiness(
      contextInfo,
      assistantTurns,
      intakeRules
    );
    contextInfo.readiness.has_recipient_anchor = derived.hasRecipientAnchor;
    contextInfo.readiness.has_occasion_anchor = derived.hasOccasion;
    contextInfo.readiness.has_timing_anchor = derived.hasTiming;
    contextInfo.readiness.has_price_anchor = derived.hasPrice;
    contextInfo.readiness.has_age_anchor = derived.hasAge;
    contextInfo.readiness.has_specificity_anchor = derived.hasSpecificity;
    contextInfo.readiness.state = derived.state;
    contextInfo.readiness.gift_ready = derived.state === "ready";
    contextInfo.readiness.missing_requirements = derived.missingRequirements;
    if (!contextInfo.readiness.reason) {
      contextInfo.readiness.reason = `Required-field state derived by the runtime: ${derived.state}.`;
    }
    // Write the effective pending dates (incl. the birthday backstop) back so
    // priorityGuidance and the {{contextInfo}} the model sees stay consistent.
    contextInfo.occasions_needing_dates = derived.pendingDates;
    textureNeedsFollowup = derived.textureNeedsFollowup;

    // All anchors satisfied. The closing line "[Name]'s all set." is always
    // runtime-owned so completion copy stays consistent and the surrounding
    // prompt's enthusiasm/CTA requirements can never leak into the close.
    if (contextInfo.readiness.state === "ready") {
      const wrapUpName =
        contextInfo.name || contextInfo.existing_name || "this person";
      const wrapUpTemplate =
        (await wrapUpTemplatePromise) ?? ADD_RECIPIENT_WRAP_UP_DEFAULT;
      const wrapUpLine = wrapUpTemplate.replace(
        /\{\{recipientName\}\}/g,
        wrapUpName
      );
      // A bare final anchor answer (age/price/date), an explicit skip, a vague
      // follow-up answer, or the one-follow-up cap reaches "ready" with no
      // meaningful final detail to acknowledge — a generated line would only
      // invent meaning, so close deterministically. `final_answer_added_texture`
      // is per-turn, so distinguishing texture volunteered earlier (then
      // completed on a later anchor) also lands here, not on the ack path.
      if (!contextInfo.final_answer_added_texture) {
        return {
          reply: wrapUpLine,
          shouldShowNextStepButton: true,
          conversationContext: contextInfo,
          resolvedSystemPrompt: null,
          timings: finishTimings("ready"),
        };
      }
      // Meaningful final answer: fall through to let the reply LLM generate the
      // recognition sentence, then append this close (see below). The next-step
      // button shows either way.
      readyAcknowledgmentClose = wrapUpLine;
    }
  }

  // Pre-compute dynamic template content
  const readinessState = contextInfo.readiness?.state ?? "not_captured";
  const recipientName =
    contextInfo.name || contextInfo.existing_name || "this person";
  const stateGuidance = buildStateGuidance(
    readinessState,
    recipientName,
    textureNeedsFollowup,
    intakeRules
  );
  const priorityGuidance = buildPriorityGuidance(contextInfo);

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
      .replace(/\{\{today\}\}/g, today)
      .replace(/\{\{requiredFields\}\}/g, renderRequiredFields(intakeRules));
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
        const dbPrompt =
          (await conversationTemplatePromise) ?? ADD_RECIPIENT_DEFAULT_TEMPLATE;
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
  // The safety boundary is prepended in code (not baked into the DB/custom
  // prompt) so it applies to every source of `systemPrompt` and can't be
  // dropped by a stale prompt version.
  const replyStartedAt = Date.now();
  let reply = await callAI(aiConfig.provider, aiConfig.model, aiConfig.apiKey, {
    messages: [
      { role: "system", content: `${SAFETY_PREAMBLE}\n\n${systemPrompt}` },
      { role: "user", content: "Please respond to continue the conversation." },
    ],
    maxTokens: 300,
    temperature: 0.7,
  });
  timings.reply_ms = Date.now() - replyStartedAt;

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
  if (isPreambleDecline(reply)) throw new AIRefusalError(reply);

  // Acknowledgment path: the reply LLM should produce only the recognition
  // sentence. Strip any close it wrote anyway (against the recognition-only
  // guidance), AND strip any question it appended: at "ready" every required
  // field is already satisfied in canonical state, so a required-field question
  // here is spurious, and letting it survive would ship it alongside the
  // runtime-appended close — the mutually-exclusive "…relationship to Sarah?
  // Sarah's all set." The completion contract holds by construction: a required-
  // field question can never share a response with the close. Append the
  // runtime-owned close exactly once so completion copy is consistent.
  if (readyAcknowledgmentClose) {
    const recognition = stripQuestions(
      stripAllSetCompletion(reply, recipientName)
    );
    reply = recognition
      ? `${recognition}\n\n${readyAcknowledgmentClose}`
      : readyAcknowledgmentClose;
  } else if (
    conversationType === "add_recipient" &&
    contextInfo.readiness?.state !== "ready"
  ) {
    // Non-ready add_recipient turn: a required field is still missing, so strip
    // any completion line the model appended. Completion must be impossible
    // while a required field is unmet — one response can never contain both a
    // required-field question and "[Name]'s all set." Keep the original reply if
    // stripping would empty it (the model wrote nothing but a stray close).
    const stripped = stripAllSetCompletion(reply, recipientName);
    if (stripped) reply = stripped;
  }

  // For add_recipient the button stays hidden until the recipient is ready:
  // either the deterministic wrap-up branch above fired, or we fell through to
  // the reply LLM at "ready" to let the prompt acknowledge the final meaningful
  // answer — in which case the button must still show. For every other
  // conversation type (update_field, extract_*) the recipient already exists,
  // so the user can save at any point.
  return {
    reply,
    shouldShowNextStepButton:
      conversationType !== "add_recipient" ||
      contextInfo.readiness?.state === "ready",
    conversationContext: contextInfo,
    resolvedSystemPrompt: systemPrompt,
    timings: finishTimings(contextInfo.readiness?.state ?? "n/a"),
  };
}
