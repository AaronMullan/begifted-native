/**
 * Shared utility to load active prompts from the system_prompt_versions table.
 * Falls back to a hardcoded default if no active version is found.
 */

// @ts-ignore - Deno/Supabase client types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function loadActivePrompt(
  supabaseUrl: string,
  serviceRoleKey: string,
  promptKey: string,
  fallback: string
): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("system_prompt_versions")
      .select("prompt_text")
      .eq("prompt_key", promptKey)
      .eq("is_active", true)
      .single();

    if (error || !data?.prompt_text) {
      console.log(
        `No active prompt found for "${promptKey}", using fallback.`
      );
      return fallback;
    }

    return data.prompt_text;
  } catch (err) {
    console.error(`Error loading prompt "${promptKey}":`, err);
    return fallback;
  }
}
