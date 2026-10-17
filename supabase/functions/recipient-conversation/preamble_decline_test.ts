import { assertEquals } from "jsr:@std/assert@1";
import { isPreambleDecline, preambleDeclineKind } from "./prompts.ts";

Deno.test("recognizes the preamble decline as the model writes it", () => {
  assertEquals(
    isPreambleDecline("I'm sorry, but that's not something I can help with."),
    true
  );
  assertEquals(
    isPreambleDecline(
      "  “I’m sorry, but that’s not something I can help with.”\n"
    ),
    true
  );
  assertEquals(
    isPreambleDecline(
      '"I’m sorry, but that’s not something I can help with."\n'
    ),
    true
  );
});

Deno.test("leaves ordinary replies alone", () => {
  assertEquals(isPreambleDecline("Who would you like to add?"), false);
  assertEquals(
    isPreambleDecline(
      "I'm sorry, but that's not something I can help with. Who would you like to add?"
    ),
    false
  );
});

Deno.test("tells the self-harm declines apart from the plain one", () => {
  assertEquals(
    preambleDeclineKind(
      "I’m sorry, but I can’t help with that, and I’m worried about you."
    ),
    "self_harm"
  );
  assertEquals(
    preambleDeclineKind(
      "\"I'm sorry, but I can't help with that, and I'm worried about them.\""
    ),
    "self_harm_other"
  );
  assertEquals(
    preambleDeclineKind("I'm sorry, but that's not something I can help with."),
    "generic"
  );
  assertEquals(preambleDeclineKind("Who would you like to add?"), null);
});
