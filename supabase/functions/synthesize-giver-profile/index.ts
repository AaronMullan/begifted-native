// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno/Supabase client types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, getApiKey, CONVERSATION_MODEL } from "../_shared/ai-client.ts";
import { internalErrorResponse } from "../_shared/error-response.ts";
import { loadActivePrompt } from "../_shared/prompt-loader.ts";
import { requireUser } from "../_shared/require-user.ts";
import {
  extractVoicePrinciple,
  VOICE_HEADING,
  VOICE_PROMPT_KEY,
} from "../_shared/voice-principle.ts";
import {
  buildGiverChoiceContext,
  latestDecisionPerGift,
} from "../_shared/gift-outcomes.ts";
import type {
  FeedbackRow,
  SuggestionTimingRow,
} from "../_shared/gift-outcomes.ts";

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

const SYSTEM_PROMPT_BODY = `You are a gift-giver profile synthesizer for a personalized gift app.

Given information about a user — their self-description, their stated gifting style, and patterns from their gift history — write a 3-5 sentence natural-language profile that captures who they are as a gift-giver.

Draw from ALL available signals:
- Self-description: who they are and their relationship to gifting
- Gifting style text: their stated approach, priorities, and budget philosophy
- Gift history: what they actually spend on each kind of relationship, and how readily they settle on a gift

Gift history describes HOW this person gives, never WHAT they bought. It spans every person they give to, so anything concrete in the profile bleeds into gifts for unrelated people. It carries no items on purpose: never guess at what was bought, and never name a gift item, product, or brand in the profile. State spending as a tendency per relationship ("spends more freely on a partner than on nieces and nephews"), not as a list of prices.

Write in third person. Never write "this user" or "the user". Be specific and concrete — avoid generic labels like "thoughtful" unless the source text uses them. Preserve the user's distinctive voice and values.`;

/**
 * Only a phrase whose whole job is to state a name counts as the user naming
 * themselves. A self-description names recipients far more often than the
 * giver, and the model cannot tell the two apart: told it may use "a name the
 * text gives as the user's own", it reliably titles the profile "Sarah is..."
 * from "Sarah is the hardest person to buy for". Whether a name may be used is
 * therefore decided here, never left to the prompt.
 *
 * "I'm X" is deliberately excluded despite being the most natural phrasing. It
 * precedes a name no more often than a nationality, a role, or a recipient's
 * possessive ("I'm Sarah's husband"), and no production self-description uses
 * it to give a name — so it can only cost accuracy here.
 */
const SELF_INTRODUCTION =
  /(?:\b[Mm]y name(?:'s|’s| is)\s+|\b[Cc]alls? me\s+|\bI(?:'m|’m| am) called\s+|\bI go by\s+)(\p{Lu}[\p{L}'’-]{0,19})(?=[.,!?;:]|\s|$)/u;

function extractSelfIntroducedName(userDescription: string): string {
  return SELF_INTRODUCTION.exec(userDescription)?.[1] ?? "";
}

/**
 * The naming rule carries the user's own name rather than an example, because a
 * literal example name in the prompt becomes the answer whenever no name is
 * supplied: the model has no other first name to reach for.
 *
 * A stored name is handed over whole for the model to pick the first name out
 * of — extracting a leading token here would name titled ("Dr. Ahmed Khan") and
 * inverted ("Smith, John") records after the wrong word.
 */
function buildNamingInstruction(
  fullName: string,
  userDescription: string
): string {
  if (fullName) {
    return `The user's name is: ${fullName}. Refer to them by their first name alone — open the profile with that first name followed by "is...". Never use their full name, surname, or any title.`;
  }

  const selfIntroduced = extractSelfIntroducedName(userDescription);
  if (selfIntroduced) {
    return `The user's name is ${selfIntroduced}. Refer to them as "${selfIntroduced}" throughout — open the profile with "${selfIntroduced} is...". Use no other name.`;
  }

  return `The user's name is not known. Never name them: no name appearing in these instructions or in the information below belongs to this user — every personal name in that text is someone they give gifts to. Write about them as "they", without writing "this user" or "the user".`;
}

const JSON_INSTRUCTION = `Return ONLY valid JSON:
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

    // full_name decides how the profile addresses the user, so it is fetched
    // alongside the preferences rather than left to the model to infer.
    const [{ data: prefs }, { data: profileRow }, voiceSourcePrompt] =
      await Promise.all([
        supabase
          .from("user_preferences")
          .select("user_description, user_summary")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .maybeSingle(),
        loadActivePrompt(supabaseUrl, supabaseServiceKey, VOICE_PROMPT_KEY, ""),
      ]);

    const fullName =
      typeof profileRow?.full_name === "string"
        ? profileRow.full_name.trim()
        : "";

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

    const { data: recipients } = await supabase
      .from("recipients")
      .select("id, relationship_type")
      .eq("user_id", userId);

    const relationshipByRecipient = new Map<string, string | null>(
      (recipients ?? []).map((r: RecipientRow) => [r.id, r.relationship_type])
    );
    const uniqueRelationships = [
      ...new Set(
        (recipients ?? [])
          .map((r: RecipientRow) => r.relationship_type)
          .filter(Boolean)
      ),
    ];

    // Price posture comes from what was chosen, never from what was merely
    // suggested — suggested prices describe the model, not the giver. Titles
    // are not even selected: this profile reaches every recipient.
    const { data: feedback } = await supabase
      .from("gift_feedback")
      .select(
        "gift_suggestion_id, recipient_id, occasion_id, action, price, created_at"
      )
      .eq("user_id", userId);
    const decisions = latestDecisionPerGift(
      (feedback ?? []).map((f: Omit<FeedbackRow, "gift_title">) => ({
        ...f,
        gift_title: null,
      }))
    );

    const chosenRecipientIds = [
      ...new Set(
        decisions.filter((d) => d.action === "chose").map((d) => d.recipient_id)
      ),
    ];
    let suggestionTimings: SuggestionTimingRow[] = [];
    if (chosenRecipientIds.length > 0) {
      const { data } = await supabase
        .from("gift_suggestions")
        .select("recipient_id, occasion_id, generated_at")
        .in("recipient_id", chosenRecipientIds);
      suggestionTimings = (data ?? []) as SuggestionTimingRow[];
    }

    const historyContext = [
      buildGiverChoiceContext(
        decisions,
        relationshipByRecipient,
        suggestionTimings
      ),
      uniqueRelationships.length > 0 &&
        `Recipients include: ${uniqueRelationships.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

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
      fullName && `Name: ${fullName}`,
      userDescription && `Self-description: ${userDescription}`,
      giftingContext && `Gifting style:\n${giftingContext}`,
      historyContext,
    ]
      .filter(Boolean)
      .join("\n\n");

    const voicePrinciple = extractVoicePrinciple(voiceSourcePrompt);
    if (voicePrinciple) {
      console.log(
        `synthesize-giver-profile: voice section attached (${voicePrinciple.length} chars from ${VOICE_PROMPT_KEY})`
      );
    } else {
      // Error level, not warn: this degrades every profile from here on and is
      // invisible in the output, so it has to be reachable by a log query that
      // filters on severity.
      console.error(
        `synthesize-giver-profile: "${VOICE_HEADING}" section not found in the active ${VOICE_PROMPT_KEY} prompt; synthesizing without voice guidance`
      );
    }

    // The voice section governs the copy attached to gift suggestions, so
    // frame it as writing guidance and let the model discard the rules that
    // only bind those fields.
    //
    // It also carries "use the recipient's name only when it improves the
    // sentence" — about the gift recipient, but the model reads it as being
    // about whoever the text names. That contradicts the naming rule outright,
    // so the naming rule is both carved out below and placed after the voice
    // block: whichever way the model resolves the conflict, it resolves it the
    // same way.
    const systemPrompt = [
      SYSTEM_PROMPT_BODY,
      voicePrinciple &&
        `Write the profile in this voice. The guidance below is BeGifted's house voice, written for the copy that accompanies gift suggestions — apply the writing principles; ignore the parts that govern specific output fields (reason_short, reason_full, tags), their character limits, the JSON they belong to, and anything it says about when to use a name:

${voicePrinciple}`,
      buildNamingInstruction(fullName, userDescription),
      JSON_INSTRUCTION,
    ]
      .filter(Boolean)
      .join("\n\n");

    const provider = "openai" as const;
    const model = CONVERSATION_MODEL;
    const apiKey = getApiKey(provider);
    const rawContent = await callAI(provider, model, apiKey, {
      messages: [
        { role: "system", content: systemPrompt },
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
