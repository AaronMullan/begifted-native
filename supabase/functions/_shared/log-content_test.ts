import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { AIRefusalError } from "./ai-client.ts";
import { internalErrorResponse } from "./error-response.ts";
import { parseOpenAIJSON } from "../recipient-conversation/utils.ts";

// These errors reach console.error in every edge function. What the user typed
// must not ride along into the function logs.
const TYPED = "Michelle has been talking about hurting herself";

Deno.test("a refusal keeps the model's wording but does not log it", () => {
  const err = new AIRefusalError(TYPED);
  assertEquals(err.refusalText, TYPED);
  assert(!Deno.inspect(err).includes("Michelle"));
});

Deno.test("an unparseable model reply throws without quoting it", () => {
  const err = assertThrows(() => parseOpenAIJSON(TYPED), SyntaxError);
  assert(!err.message.includes("Michelle"));
  assert(!Deno.inspect(err).includes("Michelle"));
});

Deno.test("the top-level handler withholds a SyntaxError's message", () => {
  const original = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(args.map((a) => Deno.inspect(a)).join(" "));
  };
  try {
    try {
      JSON.parse("Mi\nchelle has been talking about hurting herself");
    } catch (err) {
      internalErrorResponse("test", err, {});
    }
  } finally {
    console.error = original;
  }
  assertEquals(lines.length, 1);
  assert(!lines[0].includes("chelle"));
  assert(lines[0].includes("at "));
});
