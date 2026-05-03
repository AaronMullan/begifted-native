import type { AppConfig } from "@/lib/api";

export type Provider = AppConfig["ai_provider"];

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  openai: ["gpt-5", "gpt-5.4", "gpt-5.4-mini", "o4-mini"],
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-7"],
  google: ["gemini-2.5-pro", "gemini-2.5-flash"],
};
