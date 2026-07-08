// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno/Supabase client types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, getApiKey, CONVERSATION_MODEL } from "../_shared/ai-client.ts";
import { internalErrorResponse } from "../_shared/error-response.ts";
import { requireUser } from "../_shared/require-user.ts";

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

const SYSTEM_PROMPT = `You are a gift-giver profile synthesizer for a personalized gift app.

Given information about a user — their self-description, their stated gifting style, and patterns from their gift history — write a 3-5 sentence natural-language profile that captures who they are as a gift-giver.

Draw from ALL available signals:
- Self-description: who they are and their relationship to gifting
- Gifting style text: their stated approach, priorities, and budget philosophy
- Gift history patterns: types of gifts they've given and price points

Write in third person (e.g. "Aaron is..."). Be specific and concrete — avoid generic labels like "thoughtful" unless the source text uses them. Preserve the user's distinctive voice and values.

Return ONLY valid JSON:
{
  "synthesized_giver_profile": "3-5 sentence profile here"
}`;

type SynthesizeGiverProfileRequest = { userId?: unknown };

/**
 * Stored user_preferences.user_summary JSONB, written by
 * extract-user-preferences (see its UserSummaryPayload). Older rows may hold
 * a plain string where an array is expected — joinField accepts both.
 */
type StoredUserSummary = {
  user_summary?: string;
  taste_and_world?: string[] | string;
  care_and_relationship_style?: string[] | string;
  giver_style_implications?: string[] | string;
  things_to_avoid?: string[] | string;
};

type RecipientRow = { id: string; relationship_type: string | null };
type SuggestionRow = { price: number | null };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, errorResponse } = await requireUser(req, corsHeaders);
    if (errorResponse) return errorResponse;

    const { userId } = (await req.json()) as SynthesizeGiverProfileRequest;

    if (!userId || typeof userId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: userId" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // This function overwrites synthesized_giver_profile with the service
    // role, so the target must be the verified caller — not whatever userId
    // the body claims.
    if (userId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user preferences
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("user_description, user_summary")
      .eq("user_id", userId)
      .maybeSingle();

    const userDescription = prefs?.user_description ?? "";
    const userSummary =
      (prefs?.user_summary as StoredUserSummary | null) ?? null;

    if (!userDescription && !userSummary) {
      return new Response(
        JSON.stringify({ error: "No user data available for synthesis" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Fetch gift history stats aggregated across all recipients
    const { data: recipients } = await supabase
      .from("recipients")
      .select("id, relationship_type")
      .eq("user_id", userId);

    let historyContext = "";
    const recipientIds = (recipients ?? []).map((r: RecipientRow) => r.id);

    if (recipientIds.length > 0) {
      const { data: suggestions } = await supabase
        .from("gift_suggestions")
        .select("price")
        .in("recipient_id", recipientIds);

      if (suggestions && suggestions.length > 0) {
        const prices = suggestions
          .map((s: SuggestionRow) => s.price)
          .filter((p): p is number => p != null && p > 0);

        const avgPrice =
          prices.length > 0
            ? Math.round(
                prices.reduce((a: number, b: number) => a + b, 0) /
                  prices.length
              )
            : null;
        const minPrice = prices.length > 0 ? Math.min(...prices) : null;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

        const uniqueRelationships = [
          ...new Set(
            (recipients ?? [])
              .map((r: RecipientRow) => r.relationship_type)
              .filter(Boolean)
          ),
        ];

        historyContext = `Gift history patterns:
- Total gifts suggested: ${suggestions.length} across ${
          recipientIds.length
        } recipient(s)
- Price range: ${minPrice != null ? `$${minPrice}` : "unknown"} – ${
          maxPrice != null ? `$${maxPrice}` : "unknown"
        }
- Average gift price: ${avgPrice != null ? `$${avgPrice}` : "unknown"}
- Recipients include: ${uniqueRelationships.join(", ")}`;
      }
    }

    const joinField = (v: unknown): string =>
      Array.isArray(v) ? v.join("; ") : typeof v === "string" ? v : "";

    const giftingContext = userSummary
      ? [
          userSummary.user_summary && `Summary: ${userSummary.user_summary}`,
          joinField(userSummary.taste_and_world) &&
            `Taste & world: ${joinField(userSummary.taste_and_world)}`,
          joinField(userSummary.care_and_relationship_style) &&
            `Care & relationship style: ${joinField(
              userSummary.care_and_relationship_style
            )}`,
          joinField(userSummary.giver_style_implications) &&
            `Giver style: ${joinField(userSummary.giver_style_implications)}`,
          joinField(userSummary.things_to_avoid) &&
            `Avoid: ${joinField(userSummary.things_to_avoid)}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const userContext = [
      userDescription && `Self-description: ${userDescription}`,
      giftingContext && `Gifting style:\n${giftingContext}`,
      historyContext,
    ]
      .filter(Boolean)
      .join("\n\n");

    const provider = "openai" as const;
    const model = CONVERSATION_MODEL;
    const apiKey = getApiKey(provider);
    const rawContent = await callAI(provider, model, apiKey, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContext },
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
      cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleanContent) as {
      synthesized_giver_profile?: unknown;
    };
    const profile =
      typeof parsed.synthesized_giver_profile === "string"
        ? parsed.synthesized_giver_profile
        : "";

    await supabase
      .from("user_preferences")
      .update({
        synthesized_giver_profile: profile,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ synthesized_giver_profile: profile }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return internalErrorResponse(
      "synthesize-giver-profile",
      error,
      corsHeaders
    );
  }
});
