import { assertEquals } from "jsr:@std/assert@1";
import { CONVERSATION_MODEL, isReasoningOpenAIModel } from "./ai-client.ts";

// Legacy is a closed set: anything not in the gpt-3.5/gpt-4 families must take
// the reasoning-model request shape, including generations that don't exist
// yet. A wrong answer here 400s every OpenAI call from that model in production.
const CASES: [model: string, reasoning: boolean][] = [
  [CONVERSATION_MODEL, false],
  ["gpt-4.1-mini", false],
  ["gpt-4.1", false],
  ["gpt-4o", false],
  ["gpt-3.5-turbo", false],
  ["gpt-5", true],
  ["gpt-5.4-mini", true],
  ["gpt-5.6-sol", true],
  ["gpt-6-astra", true],
  ["gpt-10", true],
  ["o4-mini", true],
  ["o3", true],
  ["GPT-4.1-MINI", false],
  ["GPT-6-ASTRA", true],
];

for (const [model, reasoning] of CASES) {
  Deno.test(`isReasoningOpenAIModel(${model}) → ${reasoning}`, () => {
    assertEquals(isReasoningOpenAIModel(model), reasoning);
  });
}
