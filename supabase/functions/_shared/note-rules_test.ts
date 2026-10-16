import { assertEquals } from "jsr:@std/assert@1";
import {
  mergeNoteRules,
  parseNoteRules,
  ruleCandidateRows,
} from "./note-rules.ts";

Deno.test(
  "parseNoteRules strips repeated verbs and skips rules already listed",
  () => {
    const raw =
      '```json\n{"rules": ["No food items", "board games", "avoid Clothes", "", 4]}\n```';
    assertEquals(
      parseNoteRules(raw, ["Avoid: board games", "Kindle Paperwhite"]),
      ["food items", "Clothes"]
    );
  }
);

Deno.test("parseNoteRules returns nothing for malformed output", () => {
  assertEquals(parseNoteRules("not json", []), []);
  assertEquals(parseNoteRules('{"rules": "food"}', []), []);
});

Deno.test(
  "mergeNoteRules appends prefixed rules and keeps existing entries",
  () => {
    assertEquals(
      mergeNoteRules(
        ["Kindle Paperwhite", "Avoid: food items"],
        ["Food items", "picture frames"]
      ),
      ["Kindle Paperwhite", "Avoid: food items", "Avoid: picture frames"]
    );
    assertEquals(mergeNoteRules(["Avoid: food items"], ["food items"]), null);
    assertEquals(mergeNoteRules(null, ["clothes"]), ["Avoid: clothes"]);
  }
);

Deno.test(
  "ruleCandidateRows keeps decisions and only notes that say no",
  () => {
    const rows = [
      { action: "not_for_them", notes: null },
      { action: "gift_feedback", notes: "No food items" },
      { action: "gift_feedback", notes: "Autumn diesnt camp." },
      { action: "gift_feedback", notes: "She’s not into inscense" },
      { action: "gift_feedback", notes: "Outdoor glassware" },
      { action: "gift_feedback", notes: "Ear plugs" },
    ];
    assertEquals(
      ruleCandidateRows(rows).map((r) => r.notes),
      [null, "No food items", "Autumn diesnt camp.", "She’s not into inscense"]
    );
  }
);
