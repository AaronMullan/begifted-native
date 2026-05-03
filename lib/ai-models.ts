import type { AppConfig } from "@/lib/api";

export type Provider = AppConfig["ai_provider"];

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.5-preview", "o1-mini", "o1", "o3-mini"],
  anthropic: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-7"],
  google: ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-1.5-pro"],
};
