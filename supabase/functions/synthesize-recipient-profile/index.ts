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

const SYSTEM_PROMPT = `You are a gift recipient profile synthesizer for a personalized gift app.

Given information about a gift recipient — their relationship to the giver, interests, preferences, budget, location, and upcoming occasions — write a 3-5 sentence natural-language profile that captures who they are as a person.

Focus on describing the person, not recommending gifts. A separate step handles gift selection — your job is to give it rich, accurate context about who this recipient is.

Draw from ALL available signals:
- Relationship type and any location context
- Interests and hobbies
- Emotional tone preference (e.g. sentimental, practical, fun)
- Budget range

Write in third person (e.g. "Sarah is..."). Be specific and concrete. Surface personality, lifestyle, and values — not gift ideas or upcoming events.

AGE & DATES — read carefully:
- Only state the recipient's age if an explicit "Age:" line is given in the context below. Never guess, estimate, or infer an age from anything else.
- If no "Age:" line is present, do not mention the recipient's age or year of birth at all.
- Never put a calendar date in the profile — no gifting or holiday dates, occasion dates, anniversaries, or birthdays. The profile describes who the person is, not when events happen. Any occasions listed in the context are background only and must not appear in the profile text.

Also extract two structured fields that downstream occasion suggestions consume:

- knownRoles: an array of life roles this recipient plays that could unlock role-specific gifting occasions (Mother's Day, Father's Day, Teacher Appreciation, etc.). Use lowercase strings. Examples: "mother", "father", "grandmother", "grandfather", "teacher", "nurse", "caregiver", "veteran". Only include a role if the signal is explicit or strongly implied by the input. The relationship_type may itself imply a role (e.g. "mom" → ["mother"], "mother-in-law" → ["mother"]). Do not invent roles.
- householdContext: a short free-form sentence describing the recipient's household when known — partner/spouse, children and approximate ages, pets, cohabitants. Empty string if no signal.

Return ONLY valid JSON:
{
  "synthesized_profile": "3-5 sentence profile here",
  "knownRoles": ["lowercase_role", ...],
  "householdContext": "short sentence or empty string"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, errorResponse } = await requireUser(req, corsHeaders);
    if (errorResponse) return errorResponse;

    const { recipientId } = (await req.json()) as { recipientId?: unknown };

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
        "user_id, name, relationship_type, interests, birthday, birth_year, emotional_tone_preference, gift_budget_min, gift_budget_max, city, state, country"
      )
      .eq("id", recipientId)
      .maybeSingle();

    // Authorize the body's recipientId against the verified caller: this
    // function overwrites the recipient with the service role, so without the
    // ownership gate any signed-in user could rewrite anyone's profile by
    // iterating IDs. 404 (not 403) so foreign IDs are indistinguishable from
    // nonexistent ones.
    if (recipientError || !recipient || recipient.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Recipient not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
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

    // Recipient.birthday is text — either "YYYY-MM-DD" or "--MM-DD" when the
    // year is unknown. When the birthday carries no year, birth_year holds one
    // derived from a volunteered age ("he's 47"), so age still reaches the
    // profile without a fabricated date.
    const fullDate = recipient.birthday
      ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(recipient.birthday)
      : null;
    const birthYear = fullDate ? Number(fullDate[1]) : recipient.birth_year;
    if (birthYear) {
      const age = new Date().getFullYear() - birthYear;
      parts.push(`Age: approximately ${age}`);
    }

    const location = [recipient.city, recipient.state, recipient.country]
      .filter(Boolean)
      .join(", ");
    if (location) parts.push(`Location: ${location}`);

    if (recipient.interests && recipient.interests.length > 0) {
      parts.push(`Interests: ${recipient.interests.join(", ")}`);
    }

    // Tone: prefer the recipient's own tone. When it's unset, fall back to the
    // giver's onboarding-derived default tone (DEV-99) so gift generation still
    // reflects how this user likes to give, rather than no tone at all.
    const recipientTone = recipient.emotional_tone_preference?.trim();
    if (recipientTone) {
      parts.push(`Gift tone preference: ${recipientTone}`);
    } else if (recipient.user_id) {
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("user_summary")
        .eq("user_id", recipient.user_id)
        .maybeSingle();
      const defaultTone = prefs?.user_summary?.default_emotional_tone;
      if (typeof defaultTone === "string" && defaultTone.trim()) {
        parts.push(
          `Gift tone preference (giver's default — this recipient has none set): ${defaultTone.trim()}`
        );
      }
    }

    if (
      recipient.gift_budget_min != null ||
      recipient.gift_budget_max != null
    ) {
      const min =
        recipient.gift_budget_min != null
          ? `$${recipient.gift_budget_min}`
          : null;
      const max =
        recipient.gift_budget_max != null
          ? `$${recipient.gift_budget_max}`
          : null;
      if (min && max) parts.push(`Budget: ${min}–${max}`);
      else if (max) parts.push(`Budget: up to ${max}`);
      else if (min) parts.push(`Budget: at least ${min}`);
    }

    if (occasions && occasions.length > 0) {
      // Occasion TYPES only — never the dates. These gifting/holiday dates are
      // stored separately and consumed directly by gift generation; feeding
      // them here is what made the synthesizer write date references into the
      // profile prose and bloat it (DEV-152; earlier month/day-only mitigation
      // in DEV-105 wasn't enough). We still surface the occasion types because
      // some (Mother's Day, Father's Day, Teacher Appreciation) are signals for
      // the knownRoles extraction below — but they must not appear in the
      // profile text.
      const occasionTypes = Array.from(
        new Set(
          occasions
            .slice(0, 5)
            .map((o: { occasion_type: string | null }) => o.occasion_type)
            .filter(
              (t: unknown): t is string =>
                typeof t === "string" && t.trim().length > 0
            )
        )
      ).join(", ");
      if (occasionTypes) {
        parts.push(
          `Gifting occasions on record (background signal for role inference only — do NOT mention these, or any dates, in the profile): ${occasionTypes}`
        );
      }
    }

    const recipientContext = parts.join("\n");

    const provider = "openai" as const;
    const model = CONVERSATION_MODEL;
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
      cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleanContent) as {
      synthesized_profile?: unknown;
      knownRoles?: unknown;
      householdContext?: unknown;
    };
    const profile =
      typeof parsed.synthesized_profile === "string"
        ? parsed.synthesized_profile
        : "";
    const knownRoles = Array.isArray(parsed.knownRoles)
      ? parsed.knownRoles
          .filter((r: unknown): r is string => typeof r === "string")
          .map((r: string) => r.trim().toLowerCase())
          .filter((r: string) => r.length > 0)
      : [];
    const householdContext =
      typeof parsed.householdContext === "string"
        ? parsed.householdContext.trim()
        : "";

    await supabase
      .from("recipients")
      .update({
        synthesized_profile: profile,
        known_roles: knownRoles,
        household_context: householdContext,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipientId);

    // Chain to gift generation now that synthesized_profile is in place. We
    // run this server-side so mobile clients don't have to keep their JS task
    // alive long enough to trigger gift gen themselves (iOS will kill the app
    // before the long synthesize+generate sequence completes).
    // @ts-ignore - Deno environment variables resolved at runtime
    const giftGenUrl =
      Deno.env.get("BEGIFTED_API_URL") ?? "https://be-gifted.vercel.app";
    let giftGenStatus: number | null = null;
    try {
      const res = await fetch(`${giftGenUrl}/api/generate-gifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      giftGenStatus = res.status;
    } catch (err) {
      console.error("Failed to trigger gift generation:", err);
    }

    return new Response(
      JSON.stringify({
        synthesized_profile: profile,
        known_roles: knownRoles,
        household_context: householdContext,
        gift_generation_status: giftGenStatus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return internalErrorResponse(
      "synthesize-recipient-profile",
      error,
      corsHeaders
    );
  }
});
