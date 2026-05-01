// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno/Supabase client types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadAIConfig } from "../_shared/ai-config-loader.ts";
import { callAI, getApiKey } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore - Deno environment variables are resolved at runtime
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
// @ts-ignore - Deno environment variables are resolved at runtime
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const SYSTEM_PROMPT = `You are a gift recipient profile synthesizer for a personalized gift app.

Given information about a gift recipient — their relationship to the giver, interests, preferences, budget, location, and upcoming occasions — write a 3-5 sentence natural-language profile that captures who they are as a person.

Focus on describing the person, not recommending gifts. A separate step handles gift selection — your job is to give it rich, accurate context about who this recipient is.

Draw from ALL available signals:
- Relationship type and any location context
- Interests and hobbies
- Emotional tone preference (e.g. sentimental, practical, fun)
- Budget range
- Upcoming occasions and their timing

Write in third person (e.g. "Sarah is..."). Be specific and concrete. Surface personality, lifestyle, and values — not gift ideas. If occasions are present, note what's coming up.

Return ONLY valid JSON:
{
  "synthesized_profile": "3-5 sentence profile here"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { recipientId } = await req.json();

    if (!recipientId || typeof recipientId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: recipientId" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: recipient, error: recipientError } = await supabase
      .from("recipients")
      .select(
        "name, relationship_type, interests, birthday, emotional_tone_preference, gift_budget_min, gift_budget_max, city, state, country"
      )
      .eq("id", recipientId)
      .maybeSingle();

    if (recipientError || !recipient) {
      return new Response(
        JSON.stringify({ error: "Recipient not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const { data: occasions } = await supabase
      .from("occasions")
      .select("occasion_type, date")
      .eq("recipient_id", recipientId)
      .order("date", { ascending: true });

    // Build context
    const parts: string[] = [];

    const namePart = recipient.name ?? "This recipient";
    const relationshipPart = recipient.relationship_type
      ? `${namePart} is the giver's ${recipient.relationship_type}.`
      : `${namePart} is a gift recipient.`;
    parts.push(relationshipPart);

    if (recipient.birthday) {
      const today = new Date();
      const bday = new Date(recipient.birthday);
      const age = today.getFullYear() - bday.getFullYear();
      parts.push(`Age: approximately ${age}`);
    }

    const location = [recipient.city, recipient.state, recipient.country]
      .filter(Boolean)
      .join(", ");
    if (location) parts.push(`Location: ${location}`);

    if (recipient.interests && recipient.interests.length > 0) {
      parts.push(`Interests: ${recipient.interests.join(", ")}`);
    }

    if (recipient.emotional_tone_preference) {
      parts.push(`Gift tone preference: ${recipient.emotional_tone_preference}`);
    }

    if (recipient.gift_budget_min != null || recipient.gift_budget_max != null) {
      const min = recipient.gift_budget_min != null ? `$${recipient.gift_budget_min}` : null;
      const max = recipient.gift_budget_max != null ? `$${recipient.gift_budget_max}` : null;
      if (min && max) parts.push(`Budget: ${min}–${max}`);
      else if (max) parts.push(`Budget: up to ${max}`);
      else if (min) parts.push(`Budget: at least ${min}`);
    }

    if (occasions && occasions.length > 0) {
      const occasionLines = occasions
        .slice(0, 5)
        .map((o: any) => `${o.occasion_type} on ${o.date}`)
        .join(", ");
      parts.push(`Upcoming occasions: ${occasionLines}`);
    }

    const recipientContext = parts.join("\n");

    const { provider, model } = await loadAIConfig(supabaseUrl, supabaseServiceKey);
    const apiKey = getApiKey(provider);
    const rawContent = await callAI(provider, model, apiKey, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: recipientContext },
      ],
      maxTokens: 1024,
      temperature: 0.4,
      jsonMode: true,
    });

    let cleanContent = rawContent.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleanContent);
    const profile =
      typeof parsed.synthesized_profile === "string"
        ? parsed.synthesized_profile
        : "";

    await supabase
      .from("recipients")
      .update({
        synthesized_profile: profile,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipientId);

    return new Response(
      JSON.stringify({ synthesized_profile: profile }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
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
