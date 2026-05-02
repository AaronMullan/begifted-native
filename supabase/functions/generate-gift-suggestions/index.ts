// @ts-ignore - Deno/Supabase client types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadAIConfig } from "../_shared/ai-config-loader.ts";
import { callAIWithWebSearch, getApiKey } from "../_shared/ai-client.ts";
import type { Provider } from "../_shared/ai-client.ts";

interface CIS {
  giver: {
    name: string;
    location?: string;
    synthesized_profile?: string;
  };
  recipient: {
    name: string;
    relationship: string;
    age?: number;
    location?: string;
    interests?: string[];
    aesthetic?: string[];
    synthesized_profile?: string;
  };
  occasion: {
    type: string;
    date: string;
    significance?: string;
    budget_usd?: number;
    budget_min_usd?: number;
    budget_max_usd?: number;
  };
  history: {
    prior_gifts: { name: string; reaction?: string; notes?: string }[];
    avoid?: string[];
  };
}

interface ExistingSuggestion {
  title: string | null;
  price: number | null;
  link: string | null;
}

interface RequestBody {
  cis: CIS;
  customSystemPrompt?: string;
  overrideProvider?: Provider;
  overrideModel?: string;
  existingSuggestions?: ExistingSuggestion[];
  returnContext?: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function buildAvoidSection(existing: ExistingSuggestion[]): string {
  if (existing.length === 0) return "";
  const lines = existing.map((s) => {
    const price = s.price ? ` (~$${s.price})` : "";
    let domain = "";
    if (s.link) {
      try {
        domain = `, ${new URL(s.link).hostname.replace(/^www\./, "")}`;
      } catch { /* skip */ }
    }
    return `- "${s.title}"${price}${domain}`;
  });
  return `\nAVOID these already-suggested items (do NOT suggest these or similar items):\n${lines.join("\n")}\n`;
}

function buildWrapperMessage(cis: CIS, maxResults: number, avoidSection: string): string {
  return `
You are BeGifted — an AI gift concierge.

Follow the rules and schema defined in "BeGifted Gift Protocol v1" below.

Primary goal: return exactly ${maxResults} real, in-stock US gifts aligned to the CIS.

Tone: friendly, concise, tasteful.
${avoidSection}
CIS Data:
${JSON.stringify(cis, null, 2)}
`;
}

// @ts-ignore - Deno serve
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore - Deno env
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // @ts-ignore - Deno env
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const body = (await req.json()) as RequestBody;
    const {
      cis,
      customSystemPrompt,
      overrideProvider,
      overrideModel,
      existingSuggestions = [],
      returnContext = false,
    } = body;

    if (!cis) {
      return new Response(JSON.stringify({ error: "Missing cis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider, model } = await loadAIConfig(supabaseUrl, serviceRoleKey, {
      provider: overrideProvider,
      model: overrideModel,
    });

    const apiKey = getApiKey(provider);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `Missing API key for provider: ${provider}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let protocolPrompt = BEGIFTED_PROTOCOL_FALLBACK;
    if (customSystemPrompt) {
      protocolPrompt = customSystemPrompt;
    } else {
      try {
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const { data: activePrompt } = await supabase
          .from("system_prompt_versions")
          .select("prompt_text")
          .eq("prompt_key", "gift_generation_system")
          .eq("is_active", true)
          .single();
        if (activePrompt?.prompt_text) {
          protocolPrompt = activePrompt.prompt_text;
        }
      } catch { /* fall back to hardcoded */ }
    }

    const maxResults = 3;
    const avoidSection = buildAvoidSection(existingSuggestions);
    const wrapperMessage = buildWrapperMessage(cis, maxResults, avoidSection);
    const userInstruction = `Source and validate ${maxResults} gifts now. Return valid JSON only (no extra text).`;

    const rawText = await callAIWithWebSearch(provider, model, apiKey, {
      protocolPrompt,
      wrapperMessage,
      userInstruction,
    });

    const cleanText = rawText?.replace(/```json\n?|\n?```/g, "").trim();

    let parsed: { status: string; suggestions: unknown[] };
    try {
      parsed = cleanText ? JSON.parse(cleanText) : { status: "no_results", suggestions: [] };
    } catch {
      const match = cleanText?.match(/"suggestions":\s*\[([\s\S]*?)\]/);
      if (match) {
        try {
          parsed = { status: "ok", suggestions: JSON.parse(`[${match[1]}]`) };
        } catch {
          parsed = { status: "no_results", suggestions: [] };
        }
      } else {
        parsed = { status: "no_results", suggestions: [] };
      }
    }

    const result: Record<string, unknown> = {
      status: parsed.suggestions.length > 0 ? "ok" : "no_results",
      suggestions: parsed.suggestions,
    };

    if (returnContext) {
      result.productionContext = {
        provider,
        model,
        wrapperMessage,
        protocolPrompt,
        fullInput: [
          { role: "system", content: protocolPrompt },
          { role: "system", content: wrapperMessage },
          { role: "user", content: userInstruction },
        ],
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-gift-suggestions] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

const BEGIFTED_PROTOCOL_FALLBACK = `
BeGifted Gift Protocol v1

Purpose: Generate real, purchasable gift suggestions for U.S. recipients.

Rules Summary:
- Use web_search tool to find live product pages. NEVER invent URLs.
- ONLY use URLs that come from actual search results. Every URL must be verified from search.
- US retailers only (no Etsy, no non-US TLDs).
- Provide direct product URLs with visible "Buy" or "Add to Cart" buttons.
- Search for specific product names and model numbers on major retailers (Amazon, Target, Walmart, Best Buy).
- HARD BUDGET RULE: If budget_min_usd and budget_max_usd are present in the CIS occasion, every suggestion's price_usd MUST fall within that range (inclusive). If only budget_max_usd is set, no suggestion may exceed it. If only budget_min_usd is set, no suggestion may fall below it. These are hard constraints, not suggestions — discard any candidate that violates them.
- GIVER PROFILE: If the CIS giver includes a synthesized_profile field, use it as the primary lens for understanding the giver's style, budget philosophy, and taste — it captures who they are as a gift-giver more holistically than the raw tone/spending fields. If synthesized_profile is absent, fall back to tone and spending_tendencies.
- GIVER LOCATION: If the CIS giver includes a location field, use it to inform regionally relevant suggestions and product searches (e.g. prefer local artisans, experiences available in that region, or retailers that ship there reliably).
- RECIPIENT PROFILE: If the CIS recipient includes a synthesized_profile field, use it as the primary lens for gift selection — it captures the recipient's lifestyle, values, and aesthetic more holistically than the raw interest list. If synthesized_profile is absent, infer the recipient persona from the raw interests, age, relationship, and aesthetic fields directly.
- Output valid JSON:
  {
    "status": "ok" | "no_results",
    "suggestions": [
       { "name", "retailer", "url", "image_url", "price_usd", "category", "tags", "reason" }
    ]
  }
- Return JSON only. No commentary, no Markdown.
- CRITICAL: All URLs in the response MUST be from actual search results. Do not create or make up any URLs.
`;
