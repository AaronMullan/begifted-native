// @ts-ignore - Deno/Supabase client types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Provider = "openai" | "anthropic" | "google";
export type AIOverride = { provider?: Provider; model?: string };

export async function loadAIConfig(
  supabaseUrl: string,
  serviceRoleKey: string,
  override?: AIOverride
): Promise<{ provider: Provider; model: string }> {
  if (override?.provider && override?.model) {
    return { provider: override.provider, model: override.model };
  }

  const fallbackProvider = (Deno.env.get("AI_PROVIDER") ?? "openai") as Provider;
  const fallbackModel = Deno.env.get("AI_MODEL") ?? "gpt-5";

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("app_config")
      .select("ai_provider, ai_model")
      .eq("id", 1)
      .single();

    if (error || !data?.ai_provider || !data?.ai_model) {
      console.log("No AI config found in app_config, using fallback.");
      return { provider: fallbackProvider, model: fallbackModel };
    }

    return { provider: data.ai_provider as Provider, model: data.ai_model };
  } catch (err) {
    console.error("Error loading AI config:", err);
    return { provider: fallbackProvider, model: fallbackModel };
  }
}
