import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CATEGORY_GUIDANCE: Record<string, string> = {
  gift_generation_system: `This prompt powers a gift recommendation engine.
- Preserve the JSON output schema expectations (suggestions array with name, retailer, url, etc.)
- Preserve the product specificity requirements unless explicitly asked to change them
- Keep product URL and retailer constraints intact`,
  add_recipient_conversation: `This prompt guides a conversational flow for adding a new gift recipient.
- Preserve the stage-based response structure (Discovery → Enrichment → Ready)
- Keep the prescriptive templates intact unless explicitly asked to change them
- Maintain the template variables: {{contextInfo}}, {{conversationHistory}}, {{messageCount}}`,
  occasion_recommendations: `This prompt generates occasion/holiday recommendations for a recipient.
- Preserve the JSON output format (primaryOccasions array + additionalSuggestions)
- Keep the anti-hallucination rules for real observance days only
- Maintain the template variables: {{today}}, {{name}}, {{relationship}}, {{birthday}}, {{interests}}`,
  user_preferences_extraction: `This prompt extracts a concise gifting style summary from natural language.
- Preserve the JSON output format with a single gifting_summary string field
- The summary should be free-text (2-4 sentences), NOT categories or enum values
- This prompt has no template variables — user text is sent as a separate message`,
};

const META_SYSTEM_PROMPT = `You are a prompt engineering assistant. Your job is to help refine and improve system prompts used in a gift-planning app.

You will receive:
1. The current system prompt being used
2. A user instruction describing what they want to change
3. Chat history of previous refinement iterations

Your task:
- Rewrite the FULL system prompt incorporating the requested changes
- Keep the prompt clear, well-structured, and effective

Return your response as a JSON object with exactly these fields:
{
  "revisedPrompt": "The full rewritten system prompt text",
  "explanation": "A brief 1-2 sentence summary of what you changed and why"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { currentPrompt, userInstruction, chatHistory, promptCategory } =
      await req.json();

    if (!currentPrompt || !userInstruction) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: currentPrompt and userInstruction are required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Build category-specific system prompt
    const categoryGuidance =
      promptCategory && CATEGORY_GUIDANCE[promptCategory]
        ? `\n\nCATEGORY-SPECIFIC GUIDANCE:\n${CATEGORY_GUIDANCE[promptCategory]}`
        : CATEGORY_GUIDANCE.gift_generation_system
          ? `\n\nCATEGORY-SPECIFIC GUIDANCE:\n${CATEGORY_GUIDANCE.gift_generation_system}`
          : "";

    // Build messages for the LLM
    const messages: { role: string; content: string }[] = [
      { role: "system", content: META_SYSTEM_PROMPT + categoryGuidance },
    ];

    // Include chat history for context on previous iterations
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Current refinement request
    messages.push({
      role: "user",
      content: `Here is the current system prompt:\n\n---\n${currentPrompt}\n---\n\nPlease make the following change: ${userInstruction}`,
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error("Invalid OpenAI response:", JSON.stringify(data, null, 2));
      throw new Error("Invalid OpenAI response structure");
    }

    const result = JSON.parse(data.choices[0].message.content);

    return new Response(
      JSON.stringify({
        revisedPrompt: result.revisedPrompt,
        explanation: result.explanation,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in refine-prompt function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
