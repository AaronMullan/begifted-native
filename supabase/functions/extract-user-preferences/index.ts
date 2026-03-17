// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore - Deno environment variables are resolved at runtime
const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

const VALID_PHILOSOPHY = [
  "thoughtful",
  "practical",
  "luxury",
  "experiential",
  "balanced",
];
const VALID_CREATIVITY = [
  "traditional",
  "moderate",
  "creative",
  "very_creative",
];
const VALID_BUDGET = [
  "budget_conscious",
  "moderate",
  "premium",
  "flexible",
];
const VALID_PLANNING = [
  "early_bird",
  "moderate",
  "last_minute",
  "flexible",
];
const VALID_TONE = [
  "warm",
  "professional",
  "playful",
  "romantic",
  "casual",
];

function parseOpenAIJSON(content: string): any {
  let cleanContent = content.trim();
  if (cleanContent.startsWith("```json")) {
    cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleanContent);
}

function clampToValid(value: string | undefined, validValues: string[]): string {
  if (!value) return validValues[validValues.length - 1]; // default to last (often "flexible"/"balanced")
  const normalized = value.toLowerCase().replace(/\s+/g, "_");
  if (validValues.includes(normalized)) return normalized;
  return validValues[validValues.length - 1];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: text" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `You are a preference extraction assistant for a gift-planning app.

Given a user's natural-language description of their gifting style, extract structured preferences.

Return ONLY valid JSON with these fields:

{
  "philosophy": one of: "thoughtful", "practical", "luxury", "experiential", "balanced",
  "creativity": one of: "traditional", "moderate", "creative", "very_creative",
  "budget_style": one of: "budget_conscious", "moderate", "premium", "flexible",
  "planning_style": one of: "early_bird", "moderate", "last_minute", "flexible",
  "default_gifting_tone": one of: "warm", "professional", "playful", "romantic", "casual"
}

Pick the BEST match for each field based on the user's text. If the text doesn't clearly indicate a preference for a field, use a sensible default (usually "balanced", "moderate", or "flexible").`,
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI API error:", errorBody);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const completion = await response.json();
    const rawContent = completion.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("No content in OpenAI response");
    }

    const extracted = parseOpenAIJSON(rawContent);

    // Validate and clamp values
    const result = {
      user_stack: {
        philosophy: clampToValid(extracted.philosophy, VALID_PHILOSOPHY),
        creativity: clampToValid(extracted.creativity, VALID_CREATIVITY),
        budget_style: clampToValid(extracted.budget_style, VALID_BUDGET),
        planning_style: clampToValid(extracted.planning_style, VALID_PLANNING),
      },
      default_gifting_tone: clampToValid(
        extracted.default_gifting_tone,
        VALID_TONE
      ),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
