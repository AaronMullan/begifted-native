import { loadActivePrompt } from "../_shared/prompt-loader.ts";
import { callAI } from "../_shared/ai-client.ts";
import type { AIOverride } from "../_shared/ai-config-loader.ts";
import type { ExtractedData, RecipientData } from "../types.ts";
import { parseOpenAIJSON } from "./utils.ts";
import {
  resolveAIConfig,
  supabaseUrl,
  supabaseServiceKey,
} from "./data-extractor.ts";
import {
  inferRolesFromRelationship,
  normalizeRelationship,
} from "./relationships.ts";

// Occasion recommendation types for suggest-occasions-from-interests
export interface OccasionRecommendation {
  type: string;
  name: string;
  suggestedDate: string | null;
  isMilestone: boolean;
  reasoning: string;
}

export interface OccasionRecommendations {
  primaryOccasions: OccasionRecommendation[];
  additionalSuggestions: string[];
}
/**
 * Recommend occasions based on the recipient's interests, relationship, and birthday.
 * Leans into hobbies and interests (e.g. running → race day, music → Record Store Day).
 */
export async function recommendOccasions(
  extractedData: ExtractedData | RecipientData,
  customSystemPrompt?: string,
  aiOverride?: AIOverride
): Promise<OccasionRecommendations> {
  const aiConfig = await resolveAIConfig(aiOverride, "gpt-5.4-mini");
  const name = extractedData.name || "this person";
  const relationship = normalizeRelationship(
    extractedData.relationship_type || ""
  );
  const birthday = extractedData.birthday || null;
  const interests =
    (extractedData as ExtractedData).interests ||
    (extractedData as RecipientData).interests ||
    [];
  const explicitKnownRoles =
    (extractedData as ExtractedData).knownRoles ||
    (extractedData as RecipientData).knownRoles ||
    [];
  const knownRoles =
    explicitKnownRoles.length > 0
      ? explicitKnownRoles
      : inferRolesFromRelationship(relationship);
  const householdContext =
    (extractedData as ExtractedData).householdContext ||
    (extractedData as RecipientData).householdContext ||
    "";
  const importantDates =
    (extractedData as ExtractedData).importantDates ||
    (extractedData as RecipientData).importantDates ||
    [];
  const explicitKnownOccasions =
    (extractedData as ExtractedData).knownOccasions ||
    (extractedData as RecipientData).knownOccasions ||
    [];
  // Fall back to the recipient's already-captured occasions as known
  // occasions so the prompt can use (and avoid re-suggesting) them.
  const trackedOccasions = (extractedData as ExtractedData).occasions || [];
  const knownOccasions =
    explicitKnownOccasions.length > 0
      ? explicitKnownOccasions
      : trackedOccasions
          .filter((o) => o.occasion_type && o.occasion_type !== "birthday")
          .map((o) =>
            o.date ? `${o.occasion_type} (${o.date})` : o.occasion_type
          );
  const culturalContext =
    (extractedData as ExtractedData).culturalContext ||
    (extractedData as RecipientData).culturalContext ||
    "";
  // The recipient's stored synthesized profile — the richer "CIS / recipient
  // profile" lens the v6 prompt is written to use. Absent at add-time (new
  // recipient not yet synthesized); present for existing recipients (DEV-155).
  const synthesizedProfile = (
    (extractedData as ExtractedData).synthesized_profile ||
    (extractedData as RecipientData).synthesized_profile ||
    ""
  ).trim();

  const today = new Date().toISOString().split("T")[0];
  const birthdayStr = birthday ? `- Birthday: ${birthday}` : "";
  // Fold the synthesized profile into the {{interests}} block so the prompt's
  // recipient-profile references have something to anchor on, without needing a
  // new placeholder/prompt version. Labeled distinctly from the raw interests.
  const interestsLine =
    interests.length > 0
      ? `- Interests: ${interests.join(", ")}`
      : "- Interests: (none specified)";
  const profileLine = synthesizedProfile
    ? `- Recipient profile (synthesized): ${synthesizedProfile}`
    : "";
  const interestsStr = [interestsLine, profileLine].filter(Boolean).join("\n");
  const knownRolesStr =
    knownRoles.length > 0 ? `- Known roles: ${knownRoles.join(", ")}` : "";
  const householdContextStr = householdContext
    ? `- Household context: ${householdContext}`
    : "";
  const importantDatesStr =
    importantDates.length > 0
      ? `- Important dates: ${importantDates.join(", ")}`
      : "";
  const knownOccasionsStr =
    knownOccasions.length > 0
      ? `- Known occasions: ${knownOccasions.join(", ")}`
      : "";
  const culturalContextStr = culturalContext
    ? `- Cultural context: ${culturalContext}`
    : "";

  // Build the prompt — custom > DB > hardcoded fallback
  const hardcodedFallback = `You are a gift-planning assistant. Suggest ONLY real, verifiable occasions—no invented or creative-but-fake ones.

NO HALLUCINATION: Every primaryOccasion MUST be a real observance day, official holiday, or the recipient's birthday. Do NOT invent occasions (e.g. no "Skateboarding video release day", "Hair dye experimentation day", or similar). If you are not certain an occasion exists on an official or widely recognized calendar (national/international observance, public holiday), do not include it. Prefer fewer, real occasions over more, made-up ones.

TODAY'S DATE (all suggestedDate values must be on or after this date): {{today}}

RECIPIENT:
- Name: {{name}}
- Relationship: {{relationship}}
{{birthday}}
{{knownRoles}}
{{householdContext}}
{{interests}}

ALLOWED SOURCES (only these):
- Birthday (use their next upcoming birthday date).
- Official or widely recognized national/international observance days, e.g.: National Bird Day (Jan 5), National BBQ Day (May 16), National Country Music Day (Sep 17), Record Store Day (3rd Saturday in April), National Running Day (1st Wed in June), Earth Day (Apr 22), etc.
- Major holidays: Christmas, Thanksgiving, New Year's Day, Valentine's Day, Mother's Day, Father's Day, Halloween, etc.
Do not suggest fictional, invented, or "creative" occasions that are not real calendar events.

RULES:
- DATES MUST BE IN THE FUTURE: suggestedDate must be today or a future date (YYYY-MM-DD). Use the next occurrence for annual events. For birthday, use next upcoming birthday. Never use past years.
- Include birthday if provided; for ages 30, 40, 50, etc. set isMilestone true.
- type: lowercase snake_case, one of: birthday, major_gifting_holiday, relationship_based_occasion, interest_based_observance. Put the specific occasion in "name" (e.g. type "interest_based_observance", name "Record Store Day").
- reasoning: one short sentence tying the occasion to their interests (only for real occasions).

Return JSON only, no markdown:
{
  "primaryOccasions": [
    {
      "type": "birthday | major_gifting_holiday | relationship_based_occasion | interest_based_observance",
      "name": "Human-readable name",
      "suggestedDate": "YYYY-MM-DD or null",
      "isMilestone": false,
      "reasoning": "Why this fits their interests"
    }
  ],
  "additionalSuggestions": ["Real holiday/observance names only"]
}`;

  let promptTemplate: string;
  if (customSystemPrompt) {
    promptTemplate = customSystemPrompt;
  } else {
    promptTemplate = await loadActivePrompt(
      supabaseUrl,
      supabaseServiceKey,
      "occasion_recommendations",
      hardcodedFallback
    );
  }

  const prompt = promptTemplate
    .replace("{{today}}", today)
    .replace("{{name}}", name)
    .replace("{{relationship}}", relationship)
    .replace("{{birthday}}", birthdayStr)
    .replace("{{knownRoles}}", knownRolesStr)
    .replace("{{householdContext}}", householdContextStr)
    .replace("{{importantDates}}", importantDatesStr)
    .replace("{{knownOccasions}}", knownOccasionsStr)
    .replace("{{culturalContext}}", culturalContextStr)
    .replace("{{interests}}", interestsStr);

  let occasionsRaw: string;
  try {
    occasionsRaw = await callAI(
      aiConfig.provider,
      aiConfig.model,
      aiConfig.apiKey,
      {
        messages: [{ role: "user", content: prompt }],
        maxTokens: 900,
        temperature: 0.75,
        jsonMode: true,
      }
    );
  } catch (err) {
    console.error("recommendOccasions AI error:", err);
    return getFallbackOccasionRecommendations(birthday);
  }

  try {
    const parsed = parseOpenAIJSON(occasionsRaw);
    const primary = Array.isArray(parsed.primaryOccasions)
      ? parsed.primaryOccasions
      : [];
    const additional = Array.isArray(parsed.additionalSuggestions)
      ? parsed.additionalSuggestions
      : [];
    return {
      primaryOccasions: primary.map((o: any) => ({
        type: String(o.type || "custom")
          .replace(/\s+/g, "_")
          .toLowerCase(),
        name: String(o.name || o.type || "Occasion"),
        suggestedDate: o.suggestedDate ?? null,
        isMilestone: Boolean(o.isMilestone),
        reasoning: String(o.reasoning || ""),
      })),
      additionalSuggestions: additional.map((s: any) => String(s)),
    };
  } catch (e) {
    console.error("recommendOccasions parse error:", e);
    return getFallbackOccasionRecommendations(birthday);
  }
}

function getFallbackOccasionRecommendations(
  birthday: string | null
): OccasionRecommendations {
  const primary: OccasionRecommendation[] = [];
  if (birthday) {
    primary.push({
      type: "birthday",
      name: "Birthday",
      suggestedDate: birthday,
      isMilestone: false,
      reasoning: "Everyone deserves to feel special on their birthday.",
    });
  }
  // No generic-holiday filler: when the AI call fails we return birthday-only
  // rather than re-injecting the exact holidays the v6 prompt suppresses
  // (DEV-158). An empty list is honest about the failure.
  return {
    primaryOccasions: primary,
    additionalSuggestions: [],
  };
}
