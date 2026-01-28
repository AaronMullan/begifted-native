// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  handleConversation,
  extractFullRecipient,
  extractFields,
  extractField,
  recommendOccasions,
} from "./data-extractor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
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
    const { action, conversationType, messages, targetFields, existingData, extractedData } =
      requestBody;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing required field: action" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Handle recommend_occasions (interest-based occasion suggestions)
    if (action === "recommend_occasions") {
      const data = extractedData ?? requestBody.extractedData;
      if (!data || typeof data !== "object") {
        return new Response(
          JSON.stringify({ error: "recommend_occasions requires extractedData" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
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
          error: "Missing required fields: conversationType and messages are required",
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
