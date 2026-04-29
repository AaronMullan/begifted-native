// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { loadActivePrompt } from "../_shared/prompt-loader.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore - Deno environment variables are resolved at runtime
const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
// @ts-ignore - Deno environment variables are resolved at runtime
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
// @ts-ignore - Deno environment variables are resolved at runtime
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function parseOpenAIJSON(content: string): any {
  let cleanContent = content.trim();
  if (cleanContent.startsWith("```json")) {
    cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleanContent);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, customSystemPrompt } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: text" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const HARDCODED_FALLBACK = `You are a giver profile extraction assistant for a gift-planning app.

Given a user's natural-language description, build their CIS (Customer Intelligence Summary) — capturing their taste, values, relationship context, and giver lens so BeGifted can infer better recommendations.

Return ONLY valid JSON:

{
  "user_summary": {
    "taste_and_world": "Their aesthetic sensibility, lifestyle, and the world they inhabit",
    "care_and_relationship_style": "How they show care, their relationship values, and how they think about the people they give to",
    "giver_style_implications": "What this means for how BeGifted should approach gift recommendations for them",
    "things_to_avoid": "Styles, categories, or approaches that would feel off for this person",
    "confidence": 0.0
  }
}`;

    // Use custom prompt (playground testing) > DB active version > hardcoded fallback
    const systemPrompt = customSystemPrompt
      ? customSystemPrompt
      : await loadActivePrompt(
          supabaseUrl,
          supabaseServiceKey,
          "user_preferences_extraction",
          HARDCODED_FALLBACK
        );

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
            content: systemPrompt,
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

    const raw = extracted.user_summary ?? {};
    const result = {
      user_summary: {
        taste_and_world: typeof raw.taste_and_world === "string" ? raw.taste_and_world : "",
        care_and_relationship_style: typeof raw.care_and_relationship_style === "string" ? raw.care_and_relationship_style : "",
        giver_style_implications: typeof raw.giver_style_implications === "string" ? raw.giver_style_implications : "",
        things_to_avoid: typeof raw.things_to_avoid === "string" ? raw.things_to_avoid : "",
        confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
      },
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
