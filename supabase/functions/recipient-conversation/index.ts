// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleConversation } from "./data-extractor.ts";
import {
  extractFullRecipient,
  extractFields,
  extractField,
} from "./extractors.ts";
import { recommendOccasions } from "./occasions.ts";
import { SAFETY_PREAMBLE } from "./prompts.ts";
import { screenInput } from "../_shared/moderation.ts";

import { parseOpenAIJSON } from "./utils.ts";
import { loadAIConfig, type AIOverride } from "../_shared/ai-config-loader.ts";
import {
  internalErrorResponse,
  safetyDeclinedResponse,
} from "../_shared/error-response.ts";
import { requireUser } from "../_shared/require-user.ts";
import {
  callAI,
  getApiKey,
  CONVERSATION_MODEL,
  AIRefusalError,
  type Provider,
} from "../_shared/ai-client.ts";

// @ts-ignore - Deno environment variables are resolved at runtime
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
// @ts-ignore - Deno environment variables are resolved at runtime
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Standalone add-occasion handlers (completely separate from recipient flows) ──

async function handleAddOccasionConversation(
  messages: { role: string; content: string }[],
  recipientName: string | null,
  aiOverride?: AIOverride
) {
  const nameRef = recipientName ? ` for ${recipientName}` : "";

  const systemPrompt = `You are a concise assistant that adds calendar occasions${nameRef}. The recipient ALREADY exists — do NOT ask about names, relationships, interests, birthdays, gifts, or anything else. Your ONLY job: identify the occasion type and its date.

Rules:
- Known holiday (Christmas, St. Patrick's Day, Mother's Day, etc.) → confirm with its standard date immediately. Example: "Got it — St. Patrick's Day, March 17! Tap the button below to save."
- Personal occasion WITH a date (e.g., "anniversary June 15") → confirm. Example: "Anniversary on June 15 — tap below to save!"
- Personal occasion WITHOUT a date → ask ONLY for the date. Example: "When is the anniversary?"
- Max 1–2 sentences per response. Never mention gifts, relationships, or the person's details.`;

  const provider: Provider =
    aiOverride?.provider && aiOverride?.model ? aiOverride.provider : "openai";
  const model =
    aiOverride?.provider && aiOverride?.model
      ? aiOverride.model
      : CONVERSATION_MODEL;
  const apiKey = getApiKey(provider);
  const reply = await callAI(provider, model, apiKey, {
    messages: [
      { role: "system", content: `${SAFETY_PREAMBLE}\n\n${systemPrompt}` },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    maxTokens: 150,
    temperature: 0.3,
  });
  // Show the save button after the first AI response (user has stated the occasion)
  const userMessages = messages.filter((m) => m.role === "user");
  const shouldShowNextStepButton = userMessages.length >= 1;

  return { reply, shouldShowNextStepButton, conversationContext: null };
}

async function handleAddOccasionExtract(
  messages: { role: string; content: string }[],
  aiOverride?: AIOverride
) {
  const conversationHistory = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const prompt = `Extract the occasion from this conversation. Return ONLY JSON, no markdown:
{
  "occasion_type": "lowercase_snake_case (e.g. christmas, st_patricks_day, anniversary, mothers_day)",
  "date": "YYYY-MM-DD or null"
}

Conversation:
${conversationHistory}`;

  // Any failure here — empty LLM content, non-2xx, timeout, or unparseable
  // JSON — must NOT propagate to the top-level 500 catch: that dead-ends the
  // add-occasion flow with no way forward. Fall back to a usable "custom"
  // occasion so the client saves it with a placeholder date instead.
  let parsed: { occasion_type?: unknown; date?: unknown } = {
    occasion_type: "custom",
    date: null,
  };
  try {
    const { provider: p2, model: m2 } = await loadAIConfig(
      supabaseUrl,
      supabaseServiceKey,
      aiOverride
    );
    const key2 = getApiKey(p2);
    const extractRaw = await callAI(p2, m2, key2, {
      messages: [{ role: "user", content: prompt }],
      maxTokens: 100,
      temperature: 0.2,
      jsonMode: true,
    });
    parsed = parseOpenAIJSON(extractRaw);
  } catch (err) {
    // A refusal must fail closed, not degrade to a "custom" occasion. Only
    // genuine parse/transport failures fall back here.
    if (err instanceof AIRefusalError) throw err;
    console.error("add_occasion extract failed, falling back to custom:", err);
  }

  return {
    extractedData: {
      occasions: [
        {
          occasion_type: String(parsed.occasion_type || "custom")
            .replace(/\s+/g, "_")
            .toLowerCase(),
          date: parsed.date || null,
        },
      ],
    },
  };
}
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  try {
    const { user, errorResponse } = await requireUser(req, corsHeaders);
    if (errorResponse) return errorResponse;

    // Parse request body
    const requestBody = await req.json();
    const {
      action,
      conversationType,
      messages,
      targetFields,
      existingData,
      extractedData,
      customSystemPrompt,
      overrideProvider,
      overrideModel,
    } = requestBody;

    const aiOverride: AIOverride = {
      provider: overrideProvider,
      model: overrideModel,
    };

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing required field: action" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Handle recommend_occasions (interest-based occasion suggestions)
    if (action === "recommend_occasions") {
      const data = extractedData ?? requestBody.extractedData;
      if (!data || typeof data !== "object") {
        return new Response(
          JSON.stringify({
            error: "recommend_occasions requires extractedData",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      const result = await recommendOccasions(
        data,
        customSystemPrompt,
        aiOverride,
        user?.id
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // All other actions require conversationType and messages
    if (!conversationType || !messages) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: conversationType and messages are required",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 400,
        }
      );
    }
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({
          error: "Messages must be an array",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 400,
        }
      );
    }

    // Deterministic moderation gate: screen the latest user message before any
    // generation. Catches the hard-illegal categories (sexualized minors,
    // self-harm intent) that the prompt layer alone doesn't reliably stop, and
    // fails closed with the safety response. Runs for every message-bearing
    // action (conversation, extract, add_occasion); recommend_occasions has no
    // messages and already returned above.
    const lastUserMessage = [...messages]
      .reverse()
      .find((m: { role?: string; content?: unknown }) => m.role === "user");
    const lastUserContent = lastUserMessage?.content;
    if (lastUserContent != null && lastUserContent !== "") {
      // Coerce to string exactly as the downstream prompt does (`${m.content}`):
      // array/object content still reaches the model as readable text, so it
      // must be screened the same way rather than skipped as "not a string".
      const moderation = await screenInput(
        typeof lastUserContent === "string"
          ? lastUserContent
          : String(lastUserContent),
        getApiKey("openai")
      );
      if (moderation.blocked) {
        console.warn(
          `[moderation] blocked recipient-conversation input; categories=${moderation.categories.join(
            ","
          )}; action=${action}; conversationType=${conversationType}`
        );
        return safetyDeclinedResponse(corsHeaders);
      }
    }

    // ── add_occasion: completely separate path ──
    if (conversationType === "add_occasion") {
      let result;
      if (action === "conversation") {
        result = await handleAddOccasionConversation(
          messages,
          existingData?.name || null,
          aiOverride
        );
      } else if (action === "extract") {
        result = await handleAddOccasionExtract(messages, aiOverride);
      } else {
        return new Response(
          JSON.stringify({ error: `Invalid action: ${action}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle conversation action
    if (action === "conversation") {
      const result = await handleConversation(
        messages,
        conversationType,
        existingData,
        customSystemPrompt,
        aiOverride
      );
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      });
    }
    // Handle extract action
    if (action === "extract") {
      let result;
      // Route to appropriate extraction function based on conversation type
      switch (conversationType) {
        case "add_recipient":
          // Full recipient extraction
          result = await extractFullRecipient(messages, aiOverride);
          break;
        case "update_field":
        case "extract_interests":
        case "extract_preferences":
        case "extract_birthday":
        case "extract_address":
          // Partial field extraction
          if (targetFields && targetFields.length > 0) {
            // Extract specific fields
            result = await extractFields(
              messages,
              targetFields,
              existingData,
              aiOverride
            );
          } else if (conversationType === "update_field") {
            // Free-form "Update what we know" flow: user can mention any field.
            // Run full extraction so whatever they said gets picked up. Stored
            // interests ride along so a negation ("he does not fish") can be
            // mapped to the stored wording it should remove.
            result = await extractFullRecipient(
              messages,
              aiOverride,
              Array.isArray(existingData?.interests)
                ? existingData.interests.filter(
                    (i: unknown): i is string => typeof i === "string"
                  )
                : undefined
            );
          } else {
            // Extract based on conversation type
            const fieldMap = {
              extract_interests: "interests",
              extract_preferences: "emotional_tone_preference",
              extract_birthday: "birthday",
              extract_address: "address",
            } as const;
            const targetField = fieldMap[conversationType];
            result = await extractField(
              messages,
              targetField,
              existingData,
              aiOverride
            );
          }
          break;
        default:
          throw new Error(`Unsupported conversation type: ${conversationType}`);
      }
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      });
    }
    // Invalid action
    return new Response(
      JSON.stringify({
        error: `Invalid action: ${action}. Use 'conversation' or 'extract'`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  } catch (error) {
    if (error instanceof AIRefusalError) {
      return safetyDeclinedResponse(corsHeaders);
    }
    return internalErrorResponse("recipient-conversation", error, corsHeaders);
  }
});
