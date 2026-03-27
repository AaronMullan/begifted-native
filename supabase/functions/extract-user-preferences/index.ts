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

    const HARDCODED_FALLBACK = `You are a preference extraction assistant for a gift-planning app.

Given a user's natural-language description of their gifting style, produce a concise summary (2-4 sentences) that captures the essence of how they approach gift-giving. Preserve the user's voice and priorities — do NOT force their description into categories or labels.

Return ONLY valid JSON:

{
  "gifting_summary": "A concise summary of the user's gifting style in their own words"
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

    const result = {
      gifting_summary: typeof extracted.gifting_summary === "string"
        ? extracted.gifting_summary
        : "",
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
