import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { extractVoicePrinciple, VOICE_HEADING } from "./voice-principle.ts";

// Shaped like the live gift_generation_system prompt: the voice section sits
// between two all-caps headings, the second of which carries an underscore.
const PROMPT = `SEARCH AND VERIFICATION:
Verify availability before recommending.

${VOICE_HEADING}
These rules govern user-facing language, especially reason_short.

North star:
The highest compliment BeGifted can receive is:
"Someone at BeGifted really gets this person."

reason_short:
* One sentence; never exceed 200 characters.

NO_RESULTS:
Return no_results only when the recipient profile is unusable.

OUTPUT SCHEMA:
{ "status": "ok" }`;

Deno.test("extracts the voice section without its heading", () => {
  const voice = extractVoicePrinciple(PROMPT);
  assertStringIncludes(voice, "These rules govern user-facing language");
  assertStringIncludes(voice, "never exceed 200 characters");
  assert(!voice.startsWith(VOICE_HEADING));
});

// The no-results rules tell the model to emit a different JSON shape, so
// letting them ride along is worse than a slightly short section.
Deno.test("stops at the next heading, underscores included", () => {
  const voice = extractVoicePrinciple(PROMPT);
  assert(!voice.includes("NO_RESULTS"));
  assert(!voice.includes("Return no_results only when"));
  assert(!voice.includes("OUTPUT SCHEMA"));
});

Deno.test("returns empty when the heading is gone", () => {
  assertEquals(extractVoicePrinciple("SEARCH AND VERIFICATION:\nVerify."), "");
});

// A section that runs to the end of the prompt has no terminating heading.
Deno.test("reads to the end when no heading follows", () => {
  const voice = extractVoicePrinciple(`${VOICE_HEADING}\nWrite plainly.`);
  assertEquals(voice, "Write plainly.");
});
