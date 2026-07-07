import { callAI } from "../_shared/ai-client.ts";
import type { AIOverride } from "../_shared/ai-config-loader.ts";
import type {
  ExtractedData,
  ExtractionResponse,
  Message,
  RecipientData,
} from "../types.ts";
import { parseOpenAIJSON } from "./utils.ts";
import { resolveAIConfig } from "./data-extractor.ts";

// The LLM occasionally emits the literal string "null" (or a similar
// placeholder) for an unknown name/relationship. Because recipients.name and
// recipients.relationship_type are NOT NULL, that string gets persisted and
// shown to users as the word "null" (DEV-139). Coerce these placeholders to a
// real null so the required-field gate in the review screen treats them as
// missing and asks the user for a real value instead of saving the placeholder.
const PLACEHOLDER_STRINGS = new Set(["null", "undefined", "none", "n/a", ""]);
function coercePlaceholderToNull<T>(value: T): T | null {
  return typeof value === "string" &&
    PLACEHOLDER_STRINGS.has(value.trim().toLowerCase())
    ? null
    : value;
}
async function addBirthdayAsOccasion(
  extractedData: ExtractedData
): Promise<void> {
  const raw = extractedData.birthday;
  if (!raw) return;

  // Accept three forms: "YYYY-MM-DD", "MM-DD", or "--MM-DD" (vCard partial
  // date when birth year is unknown). All collapse to a month/day pair here.
  const noYear = /^--(\d{2})-(\d{2})$/.exec(raw);
  const parts = noYear
    ? [noYear[1], noYear[2]]
    : raw.split("-").filter((p) => p.length > 0);
  if (parts.length < 2) return;

  const month = parseInt(parts[parts.length === 3 ? 1 : 0], 10);
  const day = parseInt(parts[parts.length === 3 ? 2 : 1], 10);
  const validMonthDay =
    !isNaN(month) &&
    !isNaN(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31;
  if (!validMonthDay) return;

  const { getNextOccurrenceDate } = await import("./utils.ts");
  const nextBirthdayDate = getNextOccurrenceDate(month, day);

  const birthdayExists = extractedData.occasions?.some(
    (occ: { date: string; occasion_type: string }) =>
      occ.occasion_type === "birthday" && occ.date === nextBirthdayDate
  );
  if (birthdayExists) return;

  if (!extractedData.occasions) {
    extractedData.occasions = [];
  }
  extractedData.occasions.push({
    date: nextBirthdayDate,
    occasion_type: "birthday",
  });
}

// A single-anchor amount (e.g. "around $150") should yield a usable range so
// gift generation isn't pinned to one exact price. If extraction still
// collapses min === max, expand it around the anchor (0.8x–1.25x, snapped to
// $5). Also coerces string/"null" values to numbers. DEV-100.
// Operates only on freshly-extracted output — it never touches stored data.
function normalizeBudgetRange(data: {
  gift_budget_min?: number | string | null;
  gift_budget_max?: number | string | null;
}): void {
  const toNumber = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "" || v === "null") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const min = toNumber(data.gift_budget_min);
  const max = toNumber(data.gift_budget_max);

  // Persist coerced numeric values (or null) back onto the object.
  if ("gift_budget_min" in data) data.gift_budget_min = min;
  if ("gift_budget_max" in data) data.gift_budget_max = max;

  // Only intervene on a collapsed single anchor: both set, equal, positive.
  if (min === null || max === null || min !== max || min <= 0) return;

  const anchor = min;
  data.gift_budget_min = Math.floor((anchor * 0.8) / 5) * 5;
  data.gift_budget_max = Math.ceil((anchor * 1.25) / 5) * 5;
  console.log(
    `Budget collapsed to single value ${anchor}; expanded to ${data.gift_budget_min}-${data.gift_budget_max}`
  );
}
// Full recipient extraction (for adding new recipients)
export async function extractFullRecipient(
  messages: Message[],
  aiOverride?: AIOverride
): Promise<ExtractionResponse> {
  const aiConfig = await resolveAIConfig(aiOverride);
  console.log("=== FULL RECIPIENT EXTRACTION ===");
  console.log("Total messages:", messages.length);
  const conversationHistory = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  console.log("Full conversation being analyzed:", conversationHistory);
  // PASS 1: Critical fields extraction
  const criticalFieldsPrompt = `EXTRACT NAME AND RELATIONSHIP - This is the most important task.

Analyze this conversation and extract ONLY the recipient's name and the user's relationship to them:

${conversationHistory}

Look for these patterns:
- "my [relationship] [name]" → relationship + name
- "[Name] is my [relationship]" → name + relationship  
- "This is for my [relationship]" → relationship
- "Her/his name is [name]" → name
- Any mention of a person's name in context of gift-giving
- Any relationship words: mom, dad, mother, father, sister, brother, friend, wife, husband, partner, colleague, etc.

CRITICAL: Be aggressive in extraction. If you see ANY indication of a name or relationship, include it.

Return ONLY valid JSON (no markdown formatting):
{
  "name": "exact name found or null",
  "relationship_type": "exact relationship found or null"
}`;
  console.log("🔍 PASS 1: Extracting critical fields...");
  const criticalRaw = await callAI(
    aiConfig.provider,
    aiConfig.model,
    aiConfig.apiKey,
    {
      messages: [{ role: "user", content: criticalFieldsPrompt }],
      maxTokens: 150,
      temperature: 0.3,
      jsonMode: true,
    }
  );
  console.log("Critical fields raw response:", criticalRaw);
  let criticalFields;
  try {
    criticalFields = parseOpenAIJSON(criticalRaw);
    console.log("✅ Successfully parsed critical fields:", criticalFields);
  } catch (e) {
    console.error("❌ Failed to parse critical fields, using fallback:", e);
    criticalFields = {
      name: null,
      relationship_type: null,
    };
  }
  // Don't let a "null"-the-string placeholder pose as a real value (DEV-139).
  criticalFields.name = coercePlaceholderToNull(criticalFields.name);
  criticalFields.relationship_type = coercePlaceholderToNull(
    criticalFields.relationship_type
  );
  // PASS 2: Full extraction with critical fields as context
  const fullExtractionPrompt = `COMPREHENSIVE RECIPIENT DATA EXTRACTION

Based on this conversation, extract all available information about the gift recipient.

PRIORITY FIELDS (use these if found): 
- Name: "${criticalFields.name}"
- Relationship: "${criticalFields.relationship_type}"

Conversation:
${conversationHistory}

Look for birthday mentions like: "her birthday is...", "she was born on...", "he turns [age] on..."
Look for holidays, occasions, and special events like: "we celebrate Christmas", "Mother's Day", "anniversaries", "Valentine's Day", "New Year's", "Spring Equinox", "Autumn Equinox", "our anniversary", or any other special dates mentioned.

Extract and return valid JSON (no markdown formatting) with this exact structure:
{
  "name": ${criticalFields.name ? JSON.stringify(criticalFields.name) : "null"},
  "relationship_type": ${
    criticalFields.relationship_type
      ? JSON.stringify(criticalFields.relationship_type)
      : "null"
  },
  "birthday": "Birthday or null. Use YYYY-MM-DD only when the year is explicit; use MM-DD when only month and day are known. Never use placeholder years like 0000.",
  "age": "The recipient's CURRENT age in whole years as a number, but ONLY when the user explicitly states it (e.g. \"he's 47\", \"she just turned 30\", \"my 8 year old\"). Do NOT infer age from relationship, life stage, grade, graduation, hobbies, or occasion. null if not explicitly stated.",
  "interests": ["array of interests the recipient LIKES / is into, as expressed in this conversation"],
  "interests_removed": ["array of interests the user says the recipient is NO LONGER into, dislikes, or wants removed (e.g. \"not into pokemon anymore\", \"she's over hiking\"). Use the same wording the user/recipient used for the dropped interest. Empty array if no interest was dropped — never put a newly-liked interest here."],
  "gift_budget_min": "Lower end of the gift budget range as a number, or null. RULES: (a) explicit range like \"$50-$75\" -> 50. (b) single anchor like \"around $150\"/\"$150\" -> about 0.8x the anchor (e.g. 120). (c) upper-limit only like \"under $150\"/\"up to $250\" -> null. (d) vague answer like \"flexible\"/\"nothing too expensive\" -> null. NEVER set min equal to max for a single anchor; a single amount must become a range.",
  "gift_budget_max": "Upper end of the gift budget range as a number, or null. RULES: (a) explicit range like \"$50-$75\" -> 75. (b) single anchor like \"around $150\"/\"$150\" -> about 1.25x the anchor (e.g. 190). (c) upper-limit only like \"under $150\"/\"up to $250\" -> that number (150 / 250). (d) vague answer -> null.",
  "emotional_tone_preference": "string or null",
  "knownRoles": "Array of life roles the recipient EXPLICITLY plays, drawn only from clear conversational signals — e.g. ['mother'] when the user says they have kids together / mentions the recipient's child, ['father'], ['grandmother'], ['grandfather']. CRITICAL: do NOT infer 'mother'/'father' from spouse/partner/wife/husband status alone — only when the conversation makes parenthood explicit (their child, 'we have kids', 'mom of three', etc.). Empty array [] if no role is clearly stated.",
  "householdContext": "Short phrase describing the recipient's household when explicitly mentioned — e.g. 'shares a household with the user and their two children'. null if not stated. Do not infer children or a shared household from spouse/partner status alone.",
  "culturalContext": "Short phrase describing the recipient's cultural, ethnic, or religious context ONLY when the user explicitly states it — e.g. 'celebrates Diwali', 'observes Hanukkah', 'practicing Catholic', 'Italian-American family traditions'. null if not stated. CRITICAL: do NOT infer culture, ethnicity, or religion from a name, language, food, music taste, or any single interest — only an explicit statement counts.",
  "importantDates": ["Array of human-readable personal dates the user explicitly mentions that are NOT already captured in 'occasions' — e.g. 'wedding anniversary — September 22, 2001', 'graduation — May 2026', 'retirement — next spring'. Include the date/timeframe exactly as stated. Empty array [] if none. Do not invent dates or restate fixed holidays.",
  "address": "string or null",
  "address_line_2": "string or null",
  "city": "string or null",
  "state": "string or null",
  "zip_code": "string or null",
  "country": "string or null",
  "occasions": [
    {
      "date": "YYYY-MM-DD or null (extract date if mentioned in conversation, otherwise null)",
      "occasion_type": "lowercase_with_underscores (e.g., 'christmas', 'anniversary', 'spring_equinox', 'new_years', 'autumn_equinox')"
    }
  ],
  "confidence_score": "number 0-1 (use 0.9+ if name and relationship are clear)"
}

IMPORTANT: 
- Extract ALL occasions mentioned (holidays, anniversaries, equinoxes, solstices, personal events, etc.)
- If a date is mentioned with the occasion (e.g., "our anniversary is June 15"), extract it in YYYY-MM-DD format
- If no date is mentioned, set date to null - we'll calculate it later
- Use descriptive occasion_type names (e.g., "anniversary", "spring_equinox", "new_years", "christmas")
- If the priority fields have values, use them exactly as provided above.`;
  console.log("🔍 PASS 2: Full extraction with context...");
  const fullRaw = await callAI(
    aiConfig.provider,
    aiConfig.model,
    aiConfig.apiKey,
    {
      messages: [{ role: "user", content: fullExtractionPrompt }],
      maxTokens: 500,
      temperature: 0.3,
      jsonMode: true,
    }
  );
  console.log("Full extraction raw response:", fullRaw);
  let extractedData;
  try {
    extractedData = parseOpenAIJSON(fullRaw);
    console.log("✅ Successfully parsed full extraction:", extractedData);
  } catch (e) {
    console.error(
      "❌ Failed to parse full extraction, using fallback with critical fields:",
      e
    );
    extractedData = {
      name: criticalFields.name || undefined,
      relationship_type: criticalFields.relationship_type || undefined,
      birthday: undefined,
      interests: [],
      interests_removed: [],
      gift_budget_min: undefined,
      gift_budget_max: undefined,
      emotional_tone_preference: undefined,
      confidence_score:
        criticalFields.name && criticalFields.relationship_type ? 0.8 : 0.3,
    };
  }
  // Final validation and enhancement
  // Strip any "null"-the-string the model echoed back, so it doesn't pose as a
  // real value below or get persisted (DEV-139).
  extractedData.name = coercePlaceholderToNull(extractedData.name) ?? undefined;
  extractedData.relationship_type =
    coercePlaceholderToNull(extractedData.relationship_type) ?? undefined;
  if (criticalFields.name && !extractedData.name) {
    extractedData.name = criticalFields.name;
  }
  if (criticalFields.relationship_type && !extractedData.relationship_type) {
    extractedData.relationship_type = criticalFields.relationship_type;
  }

  // Expand a collapsed single-anchor budget into a usable range. DEV-100.
  normalizeBudgetRange(extractedData);

  // Coerce a user-stated age to a positive number or null (DEV-105). Only an
  // explicit age should reach here; the client turns it into a birth year so
  // the synopsis can derive age instead of letting the LLM guess.
  if (extractedData.age != null) {
    const n = Number(extractedData.age);
    extractedData.age = Number.isFinite(n) && n > 0 ? n : null;
  }

  // Process occasions - fill in missing dates using holiday lookup
  if (extractedData.occasions && Array.isArray(extractedData.occasions)) {
    const { convertHolidaysToOccasions } = await import("./utils.ts");

    for (const occasion of extractedData.occasions) {
      const dateMissing =
        !occasion.date || occasion.date === "null" || occasion.date === null;
      if (!dateMissing) continue;

      const holidayOccasions = convertHolidaysToOccasions([
        occasion.occasion_type,
      ]);

      if (holidayOccasions.length > 0 && holidayOccasions[0].date) {
        occasion.date = holidayOccasions[0].date;
        continue;
      }

      // Unknown occasion — placeholder Jan 1 of next year; user can edit in UI.
      const nextYear = new Date().getFullYear() + 1;
      occasion.date = `${nextYear}-01-01`;
      console.warn(
        `Unknown occasion "${occasion.occasion_type}" - using placeholder date ${occasion.date}`
      );
    }
  } else if (!extractedData.occasions) {
    extractedData.occasions = [];
  }

  if (extractedData.birthday) {
    await addBirthdayAsOccasion(extractedData);
  }
  console.log("🎯 FINAL EXTRACTION RESULTS:", {
    name: extractedData.name ? "✅ FOUND" : "❌ MISSING",
    nameValue: extractedData.name,
    relationship: extractedData.relationship_type ? "✅ FOUND" : "❌ MISSING",
    relationshipValue: extractedData.relationship_type,
    hasRequiredFields: !!(
      extractedData.name && extractedData.relationship_type
    ),
    confidence_score: extractedData.confidence_score,
    interests_count: extractedData.interests?.length || 0,
  });
  console.log("=== END FULL EXTRACTION ===");
  return {
    extractedData,
  };
}
// Partial extraction for specific fields (for updating recipients)
export async function extractFields(
  messages: Message[],
  targetFields: string[],
  existingData?: RecipientData,
  aiOverride?: AIOverride
): Promise<ExtractionResponse> {
  const aiConfig = await resolveAIConfig(aiOverride);
  console.log("=== PARTIAL FIELD EXTRACTION ===");
  console.log("Target fields:", targetFields);
  console.log("Existing data:", existingData);
  const conversationHistory = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  // Build extraction prompt for specific fields
  const existingContext = existingData?.name
    ? `We're updating information for ${existingData.name}. `
    : "We're updating recipient information. ";
  const fieldsDescription = targetFields
    .map((field) => {
      switch (field) {
        case "interests":
          return `"interests": ["array of interests mentioned or updated"]`;
        case "gift_budget_min":
          return `"gift_budget_min": "Lower end of the gift budget range as a number, or null. Explicit range \"$50-$75\" -> 50. Single anchor \"around $150\" -> about 0.8x (e.g. 120). Upper-limit only \"under $150\" -> null. Vague \"flexible\" -> null. Never set min equal to max for a single anchor."`;
        case "gift_budget_max":
          return `"gift_budget_max": "Upper end of the gift budget range as a number, or null. Explicit range \"$50-$75\" -> 75. Single anchor \"around $150\" -> about 1.25x (e.g. 190). Upper-limit only \"under $150\"/\"up to $250\" -> that number. Vague -> null."`;
        case "birthday":
          return `"birthday": "YYYY-MM-DD when year is explicit, MM-DD when only month and day are known, or null. Never use placeholder years like 0000."`;
        case "emotional_tone_preference":
          return `"emotional_tone_preference": "string or null"`;
        case "address":
          return `"address": "string or null"`;
        case "city":
          return `"city": "string or null"`;
        case "state":
          return `"state": "string or null"`;
        case "zip_code":
          return `"zip_code": "string or null"`;
        default:
          return `"${field}": "value or null"`;
      }
    })
    .join(",\n  ");
  const currentValues = existingData
    ? `
  
CURRENT VALUES:
${Object.entries(existingData)
  .filter(([key]) => targetFields.includes(key))
  .map(([key, value]) => `- ${key}: ${value || "not set"}`)
  .join("\n")}`
    : "";
  const extractionPrompt = `EXTRACT SPECIFIC FIELDS FROM CONVERSATION

${existingContext}Extract only the following fields from this conversation:

${conversationHistory}${currentValues}

Return ONLY valid JSON (no markdown formatting) with these fields:
{
  ${fieldsDescription}
}

Only include the requested fields. If a field wasn't mentioned, set it to null.`;
  console.log("🔍 Extracting fields:", targetFields);
  const fieldsRaw = await callAI(
    aiConfig.provider,
    aiConfig.model,
    aiConfig.apiKey,
    {
      messages: [{ role: "user", content: extractionPrompt }],
      maxTokens: 300,
      temperature: 0.3,
      jsonMode: true,
    }
  );
  console.log("Field extraction raw response:", fieldsRaw);
  let extractedData;
  try {
    extractedData = parseOpenAIJSON(fieldsRaw);
    console.log("✅ Successfully parsed field extraction:", extractedData);
  } catch (e) {
    console.error("❌ Failed to parse field extraction:", e);
    // Return empty object if parsing fails
    extractedData = {};
  }
  // Expand a collapsed single-anchor budget into a usable range. DEV-100.
  normalizeBudgetRange(extractedData);
  console.log("=== END PARTIAL EXTRACTION ===");
  return {
    extractedData,
  };
}
// Single field extraction (convenience wrapper)
export async function extractField(
  messages: Message[],
  field: string,
  existingData?: RecipientData,
  aiOverride?: AIOverride
): Promise<ExtractionResponse> {
  return extractFields(messages, [field], existingData, aiOverride);
}
