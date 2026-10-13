import { assertEquals } from "jsr:@std/assert@1";
import { isPreambleDecline } from "./prompts.ts";

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
