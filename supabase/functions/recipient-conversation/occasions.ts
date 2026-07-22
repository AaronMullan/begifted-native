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
import { deriveCoreOccasions } from "./core-occasions.ts";
import { buildDiscoveryAnchors } from "./discovery-anchors.ts";
import { finalizeOccasionRecommendations } from "./occasion-validation.ts";
import type {
  OccasionRecommendation,
  OccasionRecommendations,
} from "./occasion-validation.ts";

export type { OccasionRecommendation, OccasionRecommendations };

/**
 * Recommend occasions for a recipient (DEV-310 architecture).
 *
 * Core occasions (birthday, Mother's/Father's Day, anniversary, Valentine's,
 * winter gifting holiday, supplied personal dates) are derived
 * deterministically in code with code-resolved dates. The model only ranks
 * those candidates, writes the warm one-sentence copy, and picks 0–3
 * discovery suggestions from a curated anchor catalog whose dates are also
 * resolved in code. Deterministic validation then enforces required
 * occasions, real future dates, anchor whitelisting, dedup, and beta caps.
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
  // occasions so candidates and prompt avoid re-suggesting them.
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
  // profile" lens. Absent at add-time (new recipient not yet synthesized);
  // present for existing recipients (DEV-155).
  const synthesizedProfile = (
    (extractedData as ExtractedData).synthesized_profile ||
    (extractedData as RecipientData).synthesized_profile ||
    ""
  ).trim();

  // Deterministic product logic: the model never decides whether these exist.
  const coreCandidates = deriveCoreOccasions({
    relationship,
    knownRoles,
    birthday,
    importantDates,
    knownOccasions,
    culturalContext,
  });
  const discoveryAnchors = buildDiscoveryAnchors();

  const today = new Date().toISOString().split("T")[0];
  const birthdayStr = birthday ? `- Birthday: ${birthday}` : "";
  // Fold the synthesized profile into the {{interests}} block so the prompt's
  // recipient-profile references have something to anchor on, without needing
  // a dedicated placeholder. Labeled distinctly from the raw interests.
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
  const coreCandidatesStr = JSON.stringify(coreCandidates, null, 2);
  const discoveryAnchorsStr = JSON.stringify(discoveryAnchors, null, 2);

  // Build the prompt — custom > DB > hardcoded fallback
  const hardcodedFallback = `You are an occasion recommendation assistant for BeGifted.

BeGifted has already verified the core gifting occasions for this recipient. You rank them, write warm copy, and pick discovery suggestions from an approved list. You never decide whether a core occasion exists, and you never invent occasions or dates.

TODAY'S DATE: {{today}}

RECIPIENT:
- Name: {{name}}
- Relationship: {{relationship}}
{{birthday}}
{{knownRoles}}
{{householdContext}}
{{importantDates}}
{{knownOccasions}}
{{culturalContext}}
{{interests}}

CORE OCCASION CANDIDATES (the ONLY occasions allowed in primaryOccasions; reference by key):
{{coreCandidates}}

AVAILABLE DISCOVERY ANCHORS (the ONLY occasions allowed in additionalSuggestions; dates already resolved):
{{availableDiscoveryAnchors}}

RULES:
- primaryOccasions: up to 3 candidate keys, ranked by how likely the user is to add them. Every candidate marked "required": true MUST be included.
- additionalSuggestions: 0-3 anchors that genuinely fit this recipient's interests. You may personalize the display name (e.g. "Winter Solstice — Ski Season Kickoff") but anchorOccasion must be a key from the list. Return fewer (or none) over weak fits, and never two anchors for the same underlying activity.
- reasoning: one short, warm, specific sentence per occasion. No hedging.

Return JSON only, no markdown:
{
  "primaryOccasions": [
    { "key": "candidate key", "reasoning": "Why this fits this recipient." }
  ],
  "additionalSuggestions": [
    { "anchorOccasion": "anchor key", "name": "Personalized display name", "reasoning": "Why this fits this recipient." }
  ]
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
    .replace("{{interests}}", interestsStr)
    .replace("{{coreCandidates}}", coreCandidatesStr)
    .replace("{{availableDiscoveryAnchors}}", discoveryAnchorsStr);

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
    // Deterministic fallback: required core candidates with stock copy, no
    // discovery. No generic-holiday filler (DEV-158) — required candidates
    // are relationship-derived, not padding.
    return finalizeOccasionRecommendations(
      coreCandidates.filter((c) => c.required),
      discoveryAnchors,
      {}
    );
  }

  try {
    const parsed = parseOpenAIJSON(occasionsRaw);
    return finalizeOccasionRecommendations(
      coreCandidates,
      discoveryAnchors,
      parsed
    );
  } catch (e) {
    console.error("recommendOccasions parse error:", e);
    return finalizeOccasionRecommendations(
      coreCandidates.filter((c) => c.required),
      discoveryAnchors,
      {}
    );
  }
}
