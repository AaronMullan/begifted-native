import { assertEquals } from "jsr:@std/assert@1";
import { stripAllSetCompletion } from "./completion.ts";

// A required-field question and the runtime-owned completion line must never
// share one response. On a non-ready turn the reply LLM sometimes appends the
// close anyway (the Daniel contradiction); stripAllSetCompletion removes it so
// only the deterministic gate can complete.

Deno.test(
  "strips a completion line appended after a required-field question",
  () => {
    assertEquals(
      stripAllSetCompletion("About how old is Daniel? Daniel's all set."),
      "About how old is Daniel?"
    );
  }
);

Deno.test("strips 'is all set' phrasing too", () => {
  assertEquals(
    stripAllSetCompletion("When is Emily's birthday? Emily is all set!"),
    "When is Emily's birthday?"
  );
});

Deno.test("strips a leading completion line, keeping the question", () => {
  assertEquals(
    stripAllSetCompletion("Daniel's all set. About how old is Daniel?"),
    "About how old is Daniel?"
  );
});

Deno.test("leaves an ordinary question untouched", () => {
  const q = "What's a comfortable amount to spend on a typical gift for Emily?";
  assertEquals(stripAllSetCompletion(q), q);
});

Deno.test("preserves a recognition sentence, dropping only the close", () => {
  assertEquals(
    stripAllSetCompletion(
      "The Blazers are clearly a real interest for him. Daniel's all set."
    ),
    "The Blazers are clearly a real interest for him."
  );
});
