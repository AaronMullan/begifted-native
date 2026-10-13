import { assert } from "jsr:@std/assert@1";
import {
  ADD_RECIPIENT_EXTRACTION_DEFAULT,
  APPROXIMATE_BIRTHDAY_RULE,
  interpolateExtractionPrompt,
} from "./prompts.ts";

// The default is kept equal to the v1 seed in
// supabase/migrations/20261013000001_seed_add_recipient_extraction.sql.
Deno.test("interpolation fills both placeholders and keeps $ verbatim", () => {
  const history = "user: around $100, maybe $$ or $& — not sure";
  const prompt = interpolateExtractionPrompt(
    ADD_RECIPIENT_EXTRACTION_DEFAULT,
    history
  );
  assert(prompt.includes(history));
  assert(prompt.includes(APPROXIMATE_BIRTHDAY_RULE));
  assert(!prompt.includes("{{"));
});
