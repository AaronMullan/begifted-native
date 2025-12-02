import { parseOpenAIJSON } from "./utils.ts";
import type {
  ContextInfo,
  Message,
  ConversationType,
  RecipientData,
  ExtractionResponse,
  ConversationResponse,
} from "../types.ts";
// @ts-ignore - Deno environment variables are resolved at runtime
const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
// Generalized conversation handler - supports different conversation types
export async function handleConversation(
  messages: Message[],
  conversationType: ConversationType = "add_recipient",
  existingData?: RecipientData
): Promise<ConversationResponse> {
  const conversationHistory = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  // Build context info about what we know
  let contextInfo: ContextInfo = {};
  if (existingData) {
    contextInfo = {
      existing_name: existingData.name || null,
      existing_relationship: existingData.relationship_type || null,
      existing_interests: existingData.interests || [],
      existing_birthday: existingData.birthday || null,
      existing_emotional_tone_preference:
        existingData.emotional_tone_preference || null,
      existing_gift_budget_min: existingData.gift_budget_min || null,
      existing_gift_budget_max: existingData.gift_budget_max || null,
      is_update: true,
      conversation_length: messages.length,
    };
  } else {
    // Quick context extraction for new recipients
    const quickExtractionPrompt = `QUICK CONTEXT ANALYSIS - Extract what we know so far from this conversation:

${conversationHistory}

Return JSON with what's been established:

{
  "name": "person's name if clearly mentioned, null otherwise",
  "relationship": "relationship if established, null otherwise", 
  "interests": ["any interests mentioned"],
  "birthday": "birthday if mentioned (YYYY-MM-DD, MM-DD, or descriptive like 'October 31, 2002'), null otherwise",
  "occasions_mentioned": ["array of holidays/occasions mentioned (e.g., 'christmas', 'anniversary', 'kwanzaa')"],
  "other_details": "brief summary of other key details gathered",
  "conversation_length": ${messages.length},
  "readiness_score": "0-10 scale how ready this seems for next step"
}`;
    try {
      const contextResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: quickExtractionPrompt,
              },
            ],
            max_tokens: 200,
            temperature: 0.7,
            response_format: {
              type: "json_object",
            },
          }),
        }
      );
      const contextData = await contextResponse.json();
      if (contextResponse.ok && contextData.choices && contextData.choices[0]) {
        try {
          contextInfo = parseOpenAIJSON(contextData.choices[0].message.content);
        } catch (e) {
          console.error("Failed to parse context extraction:", e);
          contextInfo = {
            conversation_length: messages.length,
            readiness_score: 3,
          };
        }
      }
    } catch (e) {
      console.error("Error in context extraction:", e);
      contextInfo = {
        conversation_length: messages.length,
        readiness_score: 3,
      };
    }
  }
  // Build conversation prompt based on conversation type
  let systemPrompt = "";
  switch (conversationType) {
    case "add_recipient":
      systemPrompt = buildAddRecipientPrompt(
        contextInfo,
        conversationHistory,
        messages.length
      );
      break;
    case "update_field":
    case "extract_interests":
      systemPrompt = buildUpdateFieldPrompt(
        contextInfo,
        conversationHistory,
        messages.length,
        "interests"
      );
      break;
    case "extract_preferences":
      systemPrompt = buildUpdateFieldPrompt(
        contextInfo,
        conversationHistory,
        messages.length,
        "preferences"
      );
      break;
    case "extract_birthday":
      systemPrompt = buildUpdateFieldPrompt(
        contextInfo,
        conversationHistory,
        messages.length,
        "birthday"
      );
      break;
    case "extract_address":
      systemPrompt = buildUpdateFieldPrompt(
        contextInfo,
        conversationHistory,
        messages.length,
        "address"
      );
      break;
    default:
      systemPrompt = buildAddRecipientPrompt(
        contextInfo,
        conversationHistory,
        messages.length
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
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: "Please respond to continue the conversation.",
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  console.log("Conversation API response:", JSON.stringify(data, null, 2));
  if (!response.ok || !data.choices || !data.choices[0]) {
    console.error("OpenAI API Error (conversation):", data);
    throw new Error(
      `OpenAI API failed: ${data.error?.message || "Unknown error"}`
    );
  }
  const reply = data.choices[0].message.content;
  // Determine if we should show the "next step" button
  const shouldShowNextStepButton =
    messages.length >= 4 ||
    (contextInfo?.readiness_score ?? 0) >= 7 ||
    reply.toLowerCase().includes("ready to move forward") ||
    reply.toLowerCase().includes("let's move to the next step") ||
    reply.toLowerCase().includes("click") ||
    messages.length >= 6;
  return {
    reply,
    shouldShowNextStepButton,
    conversationContext: contextInfo,
  };
}
// Build prompt for adding new recipients
// Line 182-186: buildAddRecipientPrompt
function buildAddRecipientPrompt(
  contextInfo: ContextInfo,
  conversationHistory: string,
  messageCount: number
): string {
  return `You are a warm, enthusiastic gift concierge helping someone add a new recipient to their gift list. 

CONVERSATION CONTEXT:

${JSON.stringify(contextInfo, null, 2)}

Current conversation:

${conversationHistory}

PRESCRIPTIVE RESPONSE GUIDELINES:

STAGE-BASED RESPONSES:

- Messages 1-3 (Discovery): Ask focused questions about name, relationship, and key interests

- Messages 4-6 (Enrichment): Fill specific gaps with targeted follow-ups, ask about birthday/holidays

- Messages 6+ (Ready): Be prescriptive about next steps

REQUIRED PRESCRIPTIVE TEMPLATES:

Use these exact patterns when appropriate:

1. When you have basic info but want more:

"This gives me a great start! Feel free to tell me more about [specific aspect], or if you're ready, we can move to the next step."

2. When ready to proceed after gathering basics:

IMPORTANT: Check the CONVERSATION CONTEXT to see if birthday or occasions were already mentioned. Only ask for what's missing:
- If birthday is missing: "To make my gift suggestions even more personalized, it would be helpful to know their birthday."
- If occasions are missing: "It would be helpful to know any special holidays you like to celebrate together (Christmas, Mother's Day, anniversaries, etc.)."
- If both are provided: Skip to template #3 (fully ready to proceed)
- If one is missing: Ask only for what's missing, then say "Feel free to share what you know, or if you'd prefer to add this later, just click 'Let's move to the next step' below."

3. When fully ready to proceed:

"Perfect! I have everything I need to help you add [person's name] to your gift list and get started on tailored suggestions. Feel free to add more information, or click 'Let's move to the next step' below."

4. When missing critical info:

"Just one more thing - [specific question], then we can proceed."

5. When conversation is getting long:

"Perfect! I have everything I need to help you add [person's name] to your gift list. Click 'Let's move to the next step' below to continue."

RESPONSE REQUIREMENTS:

- Always end with a clear call-to-action
- Be specific about what's needed vs. optional
- Use established info naturally (e.g., "Mary, your mom")
- Never ask open-ended questions after message 4
- CRITICAL: Check CONVERSATION CONTEXT before asking for birthday or holidays - if they're already mentioned, acknowledge them and don't ask again
- If birthday and occasions are both already provided, use template #3 (fully ready to proceed)

Current exchange #${messageCount}. Be prescriptive and guide the user clearly:`;
}
// Build prompt for updating specific fields
function buildUpdateFieldPrompt(
  contextInfo: ContextInfo,
  conversationHistory: string,
  messageCount: number,
  fieldType: "interests" | "preferences" | "birthday" | "address"
): string {
  const existingContext = contextInfo.existing_name
    ? `We're updating information for ${contextInfo.existing_name}. `
    : "We're updating recipient information. ";
  const fieldContexts: Record<
    "interests" | "preferences" | "birthday" | "address",
    string
  > = {
    interests: `Help the user update or add interests. Current interests: ${
      (contextInfo.existing_interests || []).join(", ") || "none"
    }. Ask what new interests to add or changes to make.`,
    preferences: `Help the user update gift preferences like emotional tone, budget, or style. Current preferences: tone=${
      contextInfo.existing_emotional_tone_preference || "none"
    }, budget=${contextInfo.existing_gift_budget_min || "none"}-${
      contextInfo.existing_gift_budget_max || "none"
    }.`,
    birthday: `Help the user update the birthday. Current birthday: ${
      contextInfo.existing_birthday || "not set"
    }. Ask for the birthday in YYYY-MM-DD or MM-DD format.`,
    address: `Help the user update the address. Ask for street address, city, state, zip code.`,
  };
  return `You are a warm, helpful assistant helping someone update recipient information. 

${existingContext}${fieldContexts[fieldType]}

Current conversation:

${conversationHistory}

Be conversational and helpful. Ask follow-up questions if needed, or confirm the information clearly. After 2-3 exchanges, guide them to the next step.

Current exchange #${messageCount}:`;
}
// Full recipient extraction (for adding new recipients)
// Line 277: extractFullRecipient
export async function extractFullRecipient(
  messages: Message[]
): Promise<ExtractionResponse> {
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
  const criticalResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: criticalFieldsPrompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
        response_format: {
          type: "json_object",
        },
      }),
    }
  );
  const criticalData = await criticalResponse.json();
  console.log(
    "Critical fields API response:",
    JSON.stringify(criticalData, null, 2)
  );
  if (
    !criticalResponse.ok ||
    !criticalData.choices ||
    !criticalData.choices[0]
  ) {
    console.error("❌ OpenAI API Error (critical fields):", criticalData);
    throw new Error(
      `OpenAI API failed: ${criticalData.error?.message || "Unknown error"}`
    );
  }
  console.log(
    "Critical fields raw response:",
    criticalData.choices[0].message.content
  );
  let criticalFields;
  try {
    criticalFields = parseOpenAIJSON(criticalData.choices[0].message.content);
    console.log("✅ Successfully parsed critical fields:", criticalFields);
  } catch (e) {
    console.error("❌ Failed to parse critical fields, using fallback:", e);
    criticalFields = {
      name: null,
      relationship_type: null,
    };
  }
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
  "name": "${criticalFields.name || "null"}",
  "relationship_type": "${criticalFields.relationship_type || "null"}",
  "birthday": "YYYY-MM-DD format or null (look for birthday mentions)",
  "interests": ["array of interests mentioned"],
  "gift_budget_min": "number or null",
  "gift_budget_max": "number or null", 
  "emotional_tone_preference": "string or null",
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
  const fullResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: fullExtractionPrompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
        response_format: {
          type: "json_object",
        },
      }),
    }
  );
  const fullData = await fullResponse.json();
  console.log(
    "Full extraction API response:",
    JSON.stringify(fullData, null, 2)
  );
  if (!fullResponse.ok || !fullData.choices || !fullData.choices[0]) {
    console.error("❌ OpenAI API Error (full extraction):", fullData);
    throw new Error(
      `OpenAI API failed: ${fullData.error?.message || "Unknown error"}`
    );
  }
  console.log(
    "Full extraction raw response:",
    fullData.choices[0].message.content
  );
  let extractedData;
  try {
    extractedData = parseOpenAIJSON(fullData.choices[0].message.content);
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
      gift_budget_min: undefined,
      gift_budget_max: undefined,
      emotional_tone_preference: undefined,
      confidence_score:
        criticalFields.name && criticalFields.relationship_type ? 0.8 : 0.3,
    };
  }
  // Final validation and enhancement
  if (criticalFields.name && !extractedData.name) {
    extractedData.name = criticalFields.name;
  }
  if (criticalFields.relationship_type && !extractedData.relationship_type) {
    extractedData.relationship_type = criticalFields.relationship_type;
  }

  // Process occasions - fill in missing dates using holiday lookup
  if (extractedData.occasions && Array.isArray(extractedData.occasions)) {
    const { convertHolidaysToOccasions } = await import("./utils.ts");

    // Process each occasion
    for (const occasion of extractedData.occasions) {
      // If date is missing, try to look it up
      if (
        !occasion.date ||
        occasion.date === "null" ||
        occasion.date === null
      ) {
        const holidayOccasions = convertHolidaysToOccasions([
          occasion.occasion_type,
        ]);

        if (holidayOccasions.length > 0 && holidayOccasions[0].date) {
          // Found in lookup, use that date
          occasion.date = holidayOccasions[0].date;
        } else {
          // Unknown occasion - use placeholder date (Jan 1 of next year)
          // User can edit this later in the UI
          const nextYear = new Date().getFullYear() + 1;
          occasion.date = `${nextYear}-01-01`;
          console.warn(
            `Unknown occasion "${occasion.occasion_type}" - using placeholder date ${occasion.date}`
          );
        }
      }
    }
  } else if (!extractedData.occasions) {
    extractedData.occasions = [];
  }

  // Add birthday as an occasion if it exists (only if not already in occasions)
  if (extractedData.birthday) {
    // Parse birthday and add as occasion
    const birthdayParts = extractedData.birthday.split("-");
    if (birthdayParts.length >= 2) {
      const month = parseInt(
        birthdayParts[birthdayParts.length === 3 ? 1 : 0],
        10
      );
      const day = parseInt(
        birthdayParts[birthdayParts.length === 3 ? 2 : 1],
        10
      );

      if (
        !isNaN(month) &&
        !isNaN(day) &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31
      ) {
        const { getNextOccurrenceDate } = await import("./utils.ts");
        const nextBirthdayDate = getNextOccurrenceDate(month, day);

        const birthdayExists = extractedData.occasions?.some(
          (occ: { date: string; occasion_type: string }) =>
            occ.occasion_type === "birthday" && occ.date === nextBirthdayDate
        );

        if (!birthdayExists) {
          if (!extractedData.occasions) {
            extractedData.occasions = [];
          }
          extractedData.occasions.push({
            date: nextBirthdayDate,
            occasion_type: "birthday",
          });
        }
      }
    }
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
// Line 554: extractFields
export async function extractFields(
  messages: Message[],
  targetFields: string[],
  existingData?: RecipientData
): Promise<ExtractionResponse> {
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
        case "gift_budget_max":
          return `"${field}": "number or null"`;
        case "birthday":
          return `"birthday": "YYYY-MM-DD or MM-DD format or null"`;
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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
      response_format: {
        type: "json_object",
      },
    }),
  });
  const data = await response.json();
  console.log("Field extraction API response:", JSON.stringify(data, null, 2));
  if (!response.ok || !data.choices || !data.choices[0]) {
    console.error("❌ OpenAI API Error (field extraction):", data);
    throw new Error(
      `OpenAI API failed: ${data.error?.message || "Unknown error"}`
    );
  }
  console.log(
    "Field extraction raw response:",
    data.choices[0].message.content
  );
  let extractedData;
  try {
    extractedData = parseOpenAIJSON(data.choices[0].message.content);
    console.log("✅ Successfully parsed field extraction:", extractedData);
  } catch (e) {
    console.error("❌ Failed to parse field extraction:", e);
    // Return empty object if parsing fails
    extractedData = {};
  }
  console.log("=== END PARTIAL EXTRACTION ===");
  return {
    extractedData,
  };
}
// Single field extraction (convenience wrapper)
// Line 660: extractField
export async function extractField(
  messages: Message[],
  field: string,
  existingData?: RecipientData
): Promise<ExtractionResponse> {
  return extractFields(messages, [field], existingData);
}
