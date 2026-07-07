// @ts-ignore - Deno/Supabase client types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadAIConfig } from "../_shared/ai-config-loader.ts";
import { callAIWithWebSearch, getApiKey } from "../_shared/ai-client.ts";
import type { Provider } from "../_shared/ai-client.ts";
import { internalErrorResponse } from "../_shared/error-response.ts";
import { requireUser } from "../_shared/require-user.ts";

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
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function buildAvoidSection(existing: ExistingSuggestion[]): string {
  if (existing.length === 0) return "";
  const lines = existing.map((s) => {
    const price = s.price ? ` (~$${s.price})` : "";
    let domain = "";
    if (s.link) {
      try {
        domain = `, ${new URL(s.link).hostname.replace(/^www\./, "")}`;
      } catch {
        /* skip */
      }
    }
    return `- "${s.title}"${price}${domain}`;
  });
  return `\nAVOID these already-suggested items (do NOT suggest these or similar items):\n${lines.join(
    "\n"
  )}\n`;
}

function buildWrapperMessage(
  cis: CIS,
  maxResults: number,
  avoidSection: string
): string {
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

    const { errorResponse } = await requireUser(req, corsHeaders);
    if (errorResponse) return errorResponse;

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

    const { provider, model } = await loadAIConfig(
      supabaseUrl,
      serviceRoleKey,
      {
        provider: overrideProvider,
        model: overrideModel,
      }
    );

    const apiKey = getApiKey(provider);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `Missing API key for provider: ${provider}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // The live gift prompt is the active row in `system_prompt_versions`
    // (`prompt_key = 'gift_generation_system'`). There is intentionally NO
    // hardcoded fallback prompt: a silent fallback to stale, months-old rules
    // is its own bug class. If the active prompt can't be loaded, fail loudly
    // (logged + surfaced) rather than generating on the wrong text.
    let protocolPrompt: string;
    if (customSystemPrompt) {
      protocolPrompt = customSystemPrompt;
    } else {
      let activePromptText: string | null = null;
      try {
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const { data: activePrompt, error } = await supabase
          .from("system_prompt_versions")
          .select("prompt_text")
          .eq("prompt_key", "gift_generation_system")
          .eq("is_active", true)
          .single();
        if (error) throw error;
        activePromptText = activePrompt?.prompt_text ?? null;
      } catch (err) {
        console.error(
          "[generate-gift-suggestions] Failed to load active gift_generation_system prompt:",
          err
        );
      }

      if (!activePromptText) {
        console.error(
          "[generate-gift-suggestions] No active gift_generation_system prompt available — refusing to generate on stale rules."
        );
        return new Response(
          JSON.stringify({
            status: "no_results",
            suggestions: [],
            error:
              "Active gift-generation prompt could not be loaded. Refusing to generate on stale rules.",
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      protocolPrompt = activePromptText;
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
      parsed = cleanText
        ? JSON.parse(cleanText)
        : { status: "no_results", suggestions: [] };
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
    return internalErrorResponse("generate-gift-suggestions", err, corsHeaders);
  }
});
