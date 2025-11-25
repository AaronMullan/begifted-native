import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  GiftSuggestionRequest,
  GiftSuggestionResponse,
  UserData,
  UserPreferences,
  ParsedGiftSuggestions,
  PhilosophyType,
  CreativityType,
  BudgetStyleType,
  PlanningStyleType,
} from "../types.js";
const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  try {
    const {
      recipientName,
      relationship,
      interests,
      giftingTone,
      budget,
      conversationSummary,
      personalityTraits,
      lifestyleNotes,
      recentEvents,
      giftPreferences,
      userId,
    } = await req.json();
    // Fetch user's gifting preferences from the database
    let userPreferences: UserPreferences | null = null;
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "default_gifting_tone, user_stack, reminder_days, auto_fallback_enabled"
        )
        .eq("id", userId)
        .single();
      if (!userError && userData) {
        userPreferences = {
          giftingTone: userData.default_gifting_tone,
          philosophy: userData.user_stack?.philosophy,
          creativity: userData.user_stack?.creativity,
          budgetStyle: userData.user_stack?.budget_style,
          planningStyle: userData.user_stack?.planning_style,
        };
        console.log("User preferences loaded:", userPreferences);
      } else {
        console.log("Could not fetch user preferences:", userError);
      }
    }
    console.log("Generating enhanced gift suggestions for:", {
      recipientName,
      relationship,
      interests,
      giftingTone,
      budget,
      hasConversationContext: !!conversationSummary,
      hasPersonalityTraits: personalityTraits?.length > 0,
      hasLifestyleNotes: !!lifestyleNotes,
      hasRecentEvents: !!recentEvents,
      hasGiftPreferences: !!giftPreferences,
    });
    // Build rich context for the prompt
    let detailedContext = "";
    if (conversationSummary) {
      detailedContext += `\n**Conversation Summary**: ${conversationSummary}`;
    }
    if (personalityTraits && personalityTraits.length > 0) {
      detailedContext += `\n**Personality Traits**: ${personalityTraits.join(
        ", "
      )}`;
    }
    if (lifestyleNotes) {
      detailedContext += `\n**Lifestyle & Context**: ${lifestyleNotes}`;
    }
    if (recentEvents) {
      detailedContext += `\n**Recent Life Events**: ${recentEvents}`;
    }
    if (giftPreferences) {
      detailedContext += `\n**Gift Preferences & Style**: ${giftPreferences}`;
    }
    const hasRichContext =
      !!conversationSummary ||
      !!personalityTraits ||
      !!lifestyleNotes ||
      !!recentEvents ||
      !!giftPreferences;
    // Build user gifting style context
    let userStyleContext = "";
    if (
      userPreferences &&
      userPreferences.philosophy &&
      userPreferences.creativity &&
      userPreferences.budgetStyle &&
      userPreferences.planningStyle
    ) {
      const styleDetails: string[] = [];
      if (userPreferences.philosophy) {
        const philosophyMap = {
          thoughtful:
            "focus on gifts that reflect deep understanding of the person",
          experiences: "prefer giving experiences over material things",
          practical:
            "like gifts that solve problems or add value to daily life",
          surprise: "love creating unexpected moments of joy",
        };
        styleDetails.push(
          `Gifting Philosophy: ${
            philosophyMap[userPreferences.philosophy] ||
            userPreferences.philosophy
          }`
        );
      }
      if (userPreferences.creativity) {
        const creativityMap = {
          classic: "prefer tried-and-true gift choices",
          creative: "enjoy finding unique and unusual gifts",
          innovative: "love cutting-edge and trend-setting gifts",
        };
        styleDetails.push(
          `Creativity Preference: ${
            creativityMap[userPreferences.creativity] ||
            userPreferences.creativity
          }`
        );
      }
      if (userPreferences.budgetStyle) {
        const budgetMap = {
          mindful: "carefully consider every purchase",
          balanced: "balance cost with impact",
          generous: "believe great gifts are worth the investment",
        };
        styleDetails.push(
          `Budget Approach: ${
            budgetMap[userPreferences.budgetStyle] ||
            userPreferences.budgetStyle
          }`
        );
      }
      if (userPreferences.planningStyle) {
        const planningMap = {
          planner: "like to plan gifts well in advance",
          seasonal: "prepare for gift seasons ahead of time",
          spontaneous: "prefer to find gifts closer to the occasion",
        };
        styleDetails.push(
          `Planning Style: ${
            planningMap[userPreferences.planningStyle] ||
            userPreferences.planningStyle
          }`
        );
      }
      if (styleDetails.length > 0) {
        userStyleContext = `\n\n**GIVER'S PERSONAL STYLE**: ${styleDetails.join(
          ". "
        )}. Align all recommendations with this personal gifting approach.`;
      }
    }
    const systemPrompt = `You are an expert gift curator with access to detailed conversation context about the recipient and the gift giver's personal style. Your goal is to recommend SPECIFIC, REAL PRODUCTS that can be purchased directly from reputable online retailers.

**CRITICAL REQUIREMENTS**:
- Recommend specific ASINs from Amazon


**QUALITY STANDARDS**:
- Reference specific conversation details in descriptions
- Avoid generic suggestions that could apply to anyone
- Choose well-designed, thoughtful items
- Balance usefulness with emotional significance

**PRODUCT SPECIFICITY**:
- Example: "Nike Air Zoom Pegasus 40" NOT "running shoes"
- Example: "Born to Run by Christopher McDougal" NOT "running book"
- Example: "Brother XM2701 Sewing Machine" NOT "sewing equipment"
${userStyleContext}`;
    const userPrompt = `Create 3 exceptional, SPECIFIC gift recommendations for:

**Recipient Details**:
- Name: ${recipientName}
- Relationship: ${relationship}
- Basic Interests: ${interests || "Not specified"}
- Gifting Tone: ${giftingTone}
- Budget Range: ${budget || "Flexible"}

**Rich Context**:${detailedContext || "\n*No additional context provided*"}


**REQUIRED JSON Structure** (Return ONLY this JSON, no markdown formatting):
{
  "primaryGift": {
    "name": "Exact Product Name (Brand/Model)",
    "description": "Why this SPECIFIC product is perfect for them (reference conversation details when available)",
    "estimatedPrice": "$XX exact price or range",
    "retailer": "Specific Store Name",
    "ASIN": "ASIN of the product",
    "sourceType": "premium|thoughtful|basic",
    "reasoning": "Brief explanation of why this specific product and retailer were chosen",
    "perfectMatch": "One sentence explaining why this is the perfect gift for them"
  },
  "alternatives": [
    {
      "name": "Exact Product Name (Brand/Model)",
      "description": "Why this SPECIFIC product is perfect for them",
      "estimatedPrice": "$XX exact price or range",
      "retailer": "Specific Store Name",
      "ASIN": "ASIN of the product",
      "sourceType": "premium|thoughtful|basic",
      "reasoning": "Brief explanation of why this specific product and retailer were chosen"
    }
  ],
  "note": "Personal message explaining the thoughtfulness behind these specific product recommendations",
  "contextUsed": ${hasRichContext},
  "personalizationLevel": "high|medium|basic"
}

**VALIDATION REQUIREMENTS**:
- Each "name" must be a specific product with brand/model
- Each "ASIN" must be a valid ASIN from Amazon
- Each "retailer" must be appropriate for that product category
- Ensure products actually exist and can be purchased

Generate specific, purchasable product recommendations now:`;
    console.log(
      "Making OpenAI request with enhanced product-specific prompts..."
    );
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 1200,
      }),
    });
    const data = await response.json();
    console.log("Enhanced OpenAI response received:", {
      hasChoices: !!data.choices?.length,
      model: data.model,
      usage: data.usage,
    });
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Full OpenAI API response:", JSON.stringify(data, null, 2));
      throw new Error("Invalid OpenAI response structure");
    }
    let content = data.choices[0].message.content;
    console.log(
      "Raw enhanced OpenAI content preview:",
      content.substring(0, 200) + "..."
    );
    // Strip markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
      console.log("Extracted JSON from markdown formatting");
    }
    // Clean up any remaining formatting
    content = content.trim();
    try {
      const suggestions = JSON.parse(content);
      console.log("Enhanced suggestions parsed successfully:", {
        hasPrimaryGift: !!suggestions.primaryGift,
        alternativesCount: suggestions.alternatives?.length || 0,
        hasNote: !!suggestions.note,
        contextUsed: suggestions.contextUsed,
        personalizationLevel: suggestions.personalizationLevel,
      });
      // Validate the enhanced structure
      if (
        !suggestions.primaryGift &&
        (!suggestions.alternatives || suggestions.alternatives.length === 0)
      ) {
        throw new Error(
          "Invalid enhanced suggestions structure - missing primaryGift and alternatives"
        );
      }
      // Ensure enhanced fields are present with defaults
      const finalSuggestions = {
        primaryGift: suggestions.primaryGift
          ? {
              ...suggestions.primaryGift,
              sourceType: suggestions.primaryGift.sourceType || "thoughtful",
              reasoning:
                suggestions.primaryGift.reasoning ||
                "Selected based on interests and relationship",
              retailer: suggestions.primaryGift.retailer || "Online Store",
              ASIN: suggestions.primaryGift.ASIN || "ASIN of the product",
            }
          : null,
        alternatives: (suggestions.alternatives || []).map((gift) => ({
          ...gift,
          sourceType: gift.sourceType || "thoughtful",
          reasoning:
            gift.reasoning || "Selected based on interests and relationship",
          retailer: gift.retailer || "Online Store",
          ASIN: gift.ASIN || "ASIN of the product",
        })),
        note:
          suggestions.note ||
          `Personalized recommendations for ${recipientName}`,
        contextUsed:
          suggestions.contextUsed !== undefined
            ? suggestions.contextUsed
            : hasRichContext,
        personalizationLevel:
          suggestions.personalizationLevel ||
          (hasRichContext ? "high" : "basic"),
      };
      console.log("Enhanced gift suggestions completed successfully:", {
        hasPrimaryGift: !!finalSuggestions.primaryGift,
        alternativesCount: finalSuggestions.alternatives.length,
        contextUsed: finalSuggestions.contextUsed,
        personalizationLevel: finalSuggestions.personalizationLevel,
      });
      return new Response(JSON.stringify(finalSuggestions), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (parseError) {
      console.error("Failed to parse enhanced OpenAI response:", parseError);
      console.error("Content that failed to parse:", content);
      // Enhanced fallback suggestions with the correct structure
      const enhancedFallback = {
        primaryGift: {
          name: "Thoughtful Personalized Gift",
          description: `A carefully selected item chosen specifically for ${recipientName} based on their interests and your relationship.`,
          estimatedPrice: "$25-50",
          retailer: "Quality Retailer",
          productUrl: `https://www.google.com/search?q=${encodeURIComponent(
            `thoughtful gift for ${recipientName}`
          )}`,
          sourceType: "thoughtful",
          reasoning: "Selected for quality and thoughtfulness",
          perfectMatch: `This gift shows you understand ${recipientName}'s interests and personality.`,
        },
        alternatives: [
          {
            name: "Alternative Quality Gift",
            description: `Another thoughtful option for ${recipientName}`,
            estimatedPrice: "$20-40",
            retailer: "Specialty Store",
            productUrl: `https://www.google.com/search?q=${encodeURIComponent(
              `gift ${interests}`
            )}`,
            sourceType: "thoughtful",
            reasoning: "Alternative option based on interests",
          },
        ],
        note: `These suggestions are chosen specifically for ${recipientName}. ${
          hasRichContext
            ? "We'll generate even more personalized ideas as you complete the conversation setup!"
            : "Add more details about their interests for more specific recommendations!"
        }`,
        contextUsed: hasRichContext,
        personalizationLevel: hasRichContext ? "medium" : "basic",
      };
      console.log(
        "Returning enhanced fallback suggestions with correct structure"
      );
      return new Response(JSON.stringify(enhancedFallback), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
  } catch (error) {
    console.error(
      "Error in enhanced generate-gift-suggestions function:",
      error
    );
    return new Response(
      JSON.stringify({
        error: "Failed to generate enhanced suggestions",
        fallback: {
          primaryGift: {
            name: "Premium Quality Gift Selection",
            description:
              "A thoughtfully curated item chosen for a special someone",
            estimatedPrice: "$40-80",
            retailer: "Quality Retailer",
            productUrl:
              "https://www.google.com/search?q=thoughtful+quality+gift",
            sourceType: "thoughtful",
            reasoning: "Selected for quality and thoughtfulness",
            perfectMatch: "A meaningful gift that shows you care.",
          },
          alternatives: [],
          note: "These are quality suggestions. Complete the conversation setup for more personalized recommendations!",
          contextUsed: false,
          personalizationLevel: "basic",
        },
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
