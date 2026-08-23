import { assertEquals } from "jsr:@std/assert@1";
import { stripAllSetCompletion } from "./completion.ts";

// A required-field question and the runtime-owned completion line must never
// share one response. On a non-ready turn the reply LLM sometimes appends the
// close anyway (the Daniel contradiction); stripAllSetCompletion removes it —
// anchored to the actual recipient name — so only the deterministic gate can
// complete.

Deno.test(
  "strips a completion line appended after a required-field question",
  () => {
    assertEquals(
      stripAllSetCompletion(
        "About how old is Daniel? Daniel's all set.",
        "Daniel"
      ),
      "About how old is Daniel?"
    );
  }
);

Deno.test("strips 'is all set' phrasing too", () => {
  assertEquals(
    stripAllSetCompletion(
      "When is Emily's birthday? Emily is all set!",
      "Emily"
    ),
    "When is Emily's birthday?"
  );
});

Deno.test("strips a leading completion line, keeping the question", () => {
  assertEquals(
    stripAllSetCompletion(
      "Daniel's all set. About how old is Daniel?",
      "Daniel"
    ),
    "About how old is Daniel?"
  );
});

Deno.test("strips a completion for an accented/non-ASCII name", () => {
  // An ASCII word-class regex leaves "José's all set." intact — the exact
  // invariant this gate exists to enforce would be violated for common names.
  assertEquals(
    stripAllSetCompletion("About how old is José? José's all set.", "José"),
    "About how old is José?"
  );
});

Deno.test("leaves an ordinary question untouched", () => {
  const q = "What's a comfortable amount to spend on a typical gift for Emily?";
  assertEquals(stripAllSetCompletion(q, "Emily"), q);
});

Deno.test("does not over-strip prose that merely contains 'all set'", () => {
  // "all set" appears mid-sentence and is not the recipient's completion line.
  const a = "Once the venue is all set, what's the theme?";
  assertEquals(stripAllSetCompletion(a, "Emily"), a);
  const b = "He is all set in his ways about coffee.";
  assertEquals(stripAllSetCompletion(b, "Daniel"), b);
});

Deno.test("preserves a recognition sentence, dropping only the close", () => {
  assertEquals(
    stripAllSetCompletion(
      "The Blazers are clearly a real interest for him. Daniel's all set.",
      "Daniel"
    ),
    "The Blazers are clearly a real interest for him."
  );
});

Deno.test("no recipient name → returns the text unchanged (trimmed)", () => {
  assertEquals(
    stripAllSetCompletion("  Daniel's all set.  ", null),
    "Daniel's all set."
  );
});
