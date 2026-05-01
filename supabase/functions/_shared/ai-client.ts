export type Provider = "openai" | "anthropic" | "google";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

type CallAIOptions = {
  messages: AIMessage[];
  maxTokens: number;
  temperature: number;
  jsonMode?: boolean;
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

async function callOpenAI(model: string, apiKey: string, opts: CallAIOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    messages: opts.messages,
  };
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
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("No content in Google AI response");
  return content;
}
