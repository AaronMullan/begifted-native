import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const META_SYSTEM_PROMPT = `You are a prompt engineering assistant. Your job is to help refine and improve system prompts used for an AI gift recommendation engine.

You will receive:
1. The current system prompt being used
2. A user instruction describing what they want to change
3. Chat history of previous refinement iterations

Your task:
- Rewrite the FULL system prompt incorporating the requested changes
- Preserve the JSON output schema expectations (primaryGift, alternatives, etc.)
- Preserve the ASIN/product specificity requirements unless explicitly asked to change them
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
    const { currentPrompt, userInstruction, chatHistory } = await req.json();

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

    // Build messages for the LLM
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: META_SYSTEM_PROMPT },
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
        max_tokens: 2000,
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
