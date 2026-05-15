export type Provider = "openai" | "anthropic" | "google";

export const CONVERSATION_MODEL = "gpt-4.1-mini";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

type CallAIOptions = {
  messages: AIMessage[];
  maxTokens: number;
  temperature: number;
  jsonMode?: boolean;
};

export type WebSearchCallOptions = {
  protocolPrompt: string;
  wrapperMessage: string;
  userInstruction: string;
};

export function getApiKey(provider: Provider): string {
  const envMap: Record<Provider, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_AI_API_KEY",
  };
  // @ts-ignore - Deno environment variables
  return Deno.env.get(envMap[provider]) ?? "";
}

export async function callAI(
  provider: Provider,
  model: string,
  apiKey: string,
  opts: CallAIOptions
): Promise<string> {
  switch (provider) {
    case "openai":
      return callOpenAI(model, apiKey, opts);
    case "anthropic":
      return callAnthropic(model, apiKey, opts);
    case "google":
      return callGoogle(model, apiKey, opts);
  }
}

// Reasoning-class OpenAI models (gpt-5*, o-series) use the Chat Completions
// API but require `max_completion_tokens` instead of `max_tokens` and only
// accept the default temperature (1). Sending `max_tokens` returns a 400
// `unsupported_parameter` error. gpt-4.x and earlier keep the legacy params.
function isReasoningOpenAIModel(model: string): boolean {
  return /^(gpt-5|o\d)/i.test(model);
}

async function callOpenAI(model: string, apiKey: string, opts: CallAIOptions): Promise<string> {
  const reasoning = isReasoningOpenAIModel(model);
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
  };
  if (reasoning) {
    body.max_completion_tokens = opts.maxTokens;
  } else {
    body.max_tokens = opts.maxTokens;
    body.temperature = opts.temperature;
  }
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in OpenAI response");
  return content;
}

async function callAnthropic(model: string, apiKey: string, opts: CallAIOptions): Promise<string> {
  const systemMsg = opts.messages.find((m) => m.role === "system");
  const userMessages = opts.messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    messages: userMessages,
  };
  if (systemMsg) {
    body.system = systemMsg.content;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error("No content in Anthropic response");
  return content;
}

async function callGoogle(model: string, apiKey: string, opts: CallAIOptions): Promise<string> {
  const systemMsg = opts.messages.find((m) => m.role === "system");
  const userMessages = opts.messages.filter((m) => m.role !== "system");

  const contents = userMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature,
      maxOutputTokens: opts.maxTokens,
      ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google AI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const parts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? [];
  const content = parts.find((p) => p.text && !p.thought)?.text;
  if (!content) throw new Error("No content in Google AI response");
  return content;
}

// ── Web-search-enabled generation (for gift suggestions) ──────────────────────

export async function callAIWithWebSearch(
  provider: Provider,
  model: string,
  apiKey: string,
  opts: WebSearchCallOptions,
): Promise<string> {
  switch (provider) {
    case "openai":
      return callOpenAIWithWebSearch(model, apiKey, opts);
    case "google":
      return callGoogleWithSearch(model, apiKey, opts);
    case "anthropic":
      return callAnthropicWithWebSearch(model, apiKey, opts);
  }
}

async function callOpenAIWithWebSearch(
  model: string,
  apiKey: string,
  opts: WebSearchCallOptions,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      tool_choice: "auto",
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: opts.protocolPrompt },
        { role: "system", content: opts.wrapperMessage },
        { role: "user", content: opts.userInstruction },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${err}`);
  }

  const data = await res.json();
  const messageItem = data.output?.find((item: { type: string }) => item.type === "message");
  const text = messageItem?.content?.find((c: { type: string }) => c.type === "output_text")?.text;
  if (!text) throw new Error("No content in OpenAI response");
  return text;
}

async function callGoogleWithSearch(
  model: string,
  apiKey: string,
  opts: WebSearchCallOptions,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: opts.userInstruction }] }],
      systemInstruction: { parts: [{ text: `${opts.protocolPrompt}\n\n${opts.wrapperMessage}` }] },
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${err}`);
  }

  const data = await res.json();
  const parts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.find((p) => p.text && !p.thought)?.text;
  if (!text) throw new Error("No content in Google AI response");
  return text;
}

async function callAnthropicWithWebSearch(
  model: string,
  apiKey: string,
  opts: WebSearchCallOptions,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  const start = Date.now();
  console.log(`[anthropic] starting web search request model=${model}`);

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: `${opts.protocolPrompt}\n\n${opts.wrapperMessage}`,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: opts.userInstruction }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    console.error(`[anthropic] fetch threw after ${elapsed}ms:`, err);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Anthropic web search timed out after 120s (${elapsed}ms elapsed)`);
    }
    throw err;
  }
  clearTimeout(timer);

  const elapsed = Date.now() - start;
  console.log(`[anthropic] response status=${res.status} elapsed=${elapsed}ms`);

  if (!res.ok) {
    const body = await res.text();
    console.error(`[anthropic] error body:`, body);
    throw new Error(`Anthropic ${res.status} after ${elapsed}ms: ${body}`);
  }

  const data = await res.json();
  console.log(`[anthropic] content block types:`, data.content?.map((c: { type: string }) => c.type));

  const textBlock = data.content?.filter((c: { type: string }) => c.type === "text").pop();
  if (!textBlock?.text) throw new Error("No content in Anthropic response");
  return textBlock.text;
}
