// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  handleConversation,
  extractFullRecipient,
  extractFields,
  extractField,
  recommendOccasions,
} from "./data-extractor.ts";

import { parseOpenAIJSON } from "./utils.ts";

// @ts-ignore - Deno environment variables are resolved at runtime
const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Standalone add-occasion handlers (completely separate from recipient flows) ──

async function handleAddOccasionConversation(
  messages: { role: string; content: string }[],
  recipientName: string | null
) {
  const conversationHistory = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const nameRef = recipientName ? ` for ${recipientName}` : "";

  const systemPrompt = `You are a concise assistant that adds calendar occasions${nameRef}. The recipient ALREADY exists — do NOT ask about names, relationships, interests, birthdays, gifts, or anything else. Your ONLY job: identify the occasion type and its date.

Rules:
- Known holiday (Christmas, St. Patrick's Day, Mother's Day, etc.) → confirm with its standard date immediately. Example: "Got it — St. Patrick's Day, March 17! Tap the button below to save."
- Personal occasion WITH a date (e.g., "anniversary June 15") → confirm. Example: "Anniversary on June 15 — tap below to save!"
- Personal occasion WITHOUT a date → ask ONLY for the date. Example: "When is the anniversary?"
- Max 1–2 sentences per response. Never mention gifts, relationships, or the person's details.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 150,
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.choices?.[0]) {
    throw new Error(
      `OpenAI API failed: ${data.error?.message || "Unknown error"}`
    );
  }

  const reply = data.choices[0].message.content;
  // Show the save button after the first AI response (user has stated the occasion)
  const userMessages = messages.filter((m) => m.role === "user");
  const shouldShowNextStepButton = userMessages.length >= 1;

  return { reply, shouldShowNextStepButton, conversationContext: null };
}

async function handleAddOccasionExtract(
  messages: { role: string; content: string }[]
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.choices?.[0]?.message?.content) {
    throw new Error(
      `OpenAI API failed: ${data.error?.message || "Unknown error"}`
    );
  }

  let parsed;
  try {
    parsed = parseOpenAIJSON(data.choices[0].message.content);
  } catch {
    parsed = { occasion_type: "custom", date: null };
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
    // Parse request body
    const requestBody = await req.json();
    const {
      action,
      conversationType,
      messages,
      targetFields,
      existingData,
      extractedData,
    } = requestBody;

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
      const result = await recommendOccasions(data);
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
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Messages must be a non-empty array",
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
    // ── add_occasion: completely separate path ──
    if (conversationType === "add_occasion") {
      let result;
      if (action === "conversation") {
        result = await handleAddOccasionConversation(
          messages,
          existingData?.name || null
        );
      } else if (action === "extract") {
        result = await handleAddOccasionExtract(messages);
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
        existingData
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
          result = await extractFullRecipient(messages);
          break;
        case "update_field":
        case "extract_interests":
        case "extract_preferences":
        case "extract_birthday":
        case "extract_address":
          // Partial field extraction
          if (targetFields && targetFields.length > 0) {
            // Extract specific fields
            result = await extractFields(messages, targetFields, existingData);
          } else {
            // Extract based on conversation type
            const fieldMap = {
              add_recipient: "",
              update_field: "",
              extract_interests: "interests",
              extract_preferences: "emotional_tone_preference",
              extract_birthday: "birthday",
              extract_address: "address",
            };
            const targetField = fieldMap[conversationType];
            if (targetField) {
              result = await extractField(messages, targetField, existingData);
            } else {
              throw new Error(
                `No target field specified for conversation type: ${conversationType}`
              );
            }
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
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
