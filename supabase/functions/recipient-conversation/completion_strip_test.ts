import { assertEquals } from "jsr:@std/assert@1";
import {
  stripAllSetCompletion,
  stripHandoffClaims,
  stripQuestions,
} from "./completion.ts";

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

// stripQuestions guards the acknowledgment turn: a required-field question for a
// field already satisfied in canonical state must never survive to ride
// alongside the runtime-appended close (the Sarah "…relationship to Sarah?
// Sarah's all set." contradiction).

Deno.test(
  "drops a trailing required-field question, keeps the recognition",
  () => {
    assertEquals(
      stripQuestions(
        "Her ceramics and love of minimal interiors give a clear read on her taste. What's your relationship to Sarah?"
      ),
      "Her ceramics and love of minimal interiors give a clear read on her taste."
    );
  }
);

Deno.test("drops a leading question, keeps the recognition", () => {
  assertEquals(
    stripQuestions(
      "What's your relationship to Sarah? Her ceramics give a clear read on her taste."
    ),
    "Her ceramics give a clear read on her taste."
  );
});

Deno.test(
  "a question-only recognition strips to empty (caller uses close alone)",
  () => {
    assertEquals(stripQuestions("What's your relationship to Sarah?"), "");
  }
);

Deno.test("leaves a declarative recognition untouched", () => {
  const r = "The Blazers are clearly a real interest for him.";
  assertEquals(stripQuestions(r), r);
});

Deno.test("keeps an exclamatory recognition, drops only the question", () => {
  assertEquals(
    stripQuestions("History is clearly his lane! When is his birthday?"),
    "History is clearly his lane!"
  );
});

Deno.test("drops a question punctuated ?! (not just a bare ?)", () => {
  assertEquals(
    stripQuestions(
      "Her ceramics show real taste. What's your relationship to Sarah?!"
    ),
    "Her ceramics show real taste."
  );
});

Deno.test("drops a question punctuated ?...", () => {
  assertEquals(
    stripQuestions("Her taste is clear. What about her budget?..."),
    "Her taste is clear."
  );
});

Deno.test(
  "preserves a decimal in a declarative recognition (no re-spacing)",
  () => {
    const r = "She spends about $4.50 a day on specialty coffee.";
    assertEquals(stripQuestions(r), r);
  }
);

Deno.test("preserves abbreviations in a declarative recognition", () => {
  const r = "He's clearly proud of his U.S. Navy service.";
  assertEquals(stripQuestions(r), r);
});

Deno.test(
  "drops a parenthetical question whole, leaving no stray bracket",
  () => {
    assertEquals(
      stripQuestions("Her taste is clear. (When's her birthday?)"),
      "Her taste is clear."
    );
  }
);

Deno.test(
  "backstop: an unsplittable question strips to empty (close-only)",
  () => {
    // No terminal punctuation before the question, so it can't be segmented off;
    // the "?" backstop guarantees it still never ships alongside the close.
    assertEquals(
      stripQuestions("History is clearly his lane — when's his birthday?"),
      ""
    );
  }
);

// The ready-turn closing must not claim the recipient is saved, that gift
// ideas have started, or that BeGifted is taking over — none of that has
// happened until the review screen.

Deno.test(
  "drops a take-it-from-here / gift-ideas sentence, keeps the observation",
  () => {
    assertEquals(
      stripHandoffClaims(
        "The Blazers are clearly a real interest for him. I'll take it from here and start pulling together a few gift ideas for Tom."
      ),
      "The Blazers are clearly a real interest for him."
    );
  }
);

Deno.test("drops a saved/added claim", () => {
  assertEquals(
    stripHandoffClaims("That covers what's needed. Lena has been saved."),
    "That covers what's needed."
  );
  assertEquals(
    stripHandoffClaims(
      "Lena is added to your list. Ceramics gives a clear read."
    ),
    "Ceramics gives a clear read."
  );
});

Deno.test("drops recommendation and next-step language", () => {
  assertEquals(
    stripHandoffClaims(
      "Sunday pasta says a lot. BeGifted will now find recommendations."
    ),
    "Sunday pasta says a lot."
  );
});

Deno.test("returns empty when nothing truthful remains", () => {
  assertEquals(stripHandoffClaims("Gift ideas for Sam are on the way."), "");
});

Deno.test("leaves a grounded observation untouched", () => {
  const line =
    "History and political biographies give a clear read on what he reaches for.";
  assertEquals(stripHandoffClaims(line), line);
});

Deno.test("does not treat 'saves' or 'add' in a detail as a claim", () => {
  const line =
    "She saves every ticket stub, and the add-on tours are her thing.";
  assertEquals(stripHandoffClaims(line), line);
});
