import { assertEquals } from "jsr:@std/assert@1";
import {
  mergeNoteRules,
  parseNoteRules,
  ruleCandidateRows,
} from "./note-rules.ts";

Deno.test(
  "parseNoteRules keeps only rule verdicts, strips repeated verbs and skips rules already listed",
  () => {
    const v = (rule: unknown, kind = "rule") => ({ note: "n", kind, rule });
    const raw = `\`\`\`json\n${JSON.stringify({
      notes: [
        v("No food items"),
        v("board games"),
        v("avoid Clothes"),
        v(""),
        v(4),
        v("candles", "item"),
        v(null, "product"),
      ],
    })}\n\`\`\``;
    assertEquals(
      parseNoteRules(raw, ["Avoid: board games", "Kindle Paperwhite"]),
      ["food items", "Clothes"]
    );
  }
);

Deno.test("parseNoteRules returns nothing for malformed output", () => {
  assertEquals(parseNoteRules("not json", []), []);
  assertEquals(parseNoteRules('{"notes": "food"}', []), []);
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

Deno.test("ruleCandidateRows keeps rules stated as verbs or 'nothing'", () => {
  const notes = [
    "Avoid candles",
    "Nothing edible",
    "She hates anything scented",
    "Skip food",
  ];
  assertEquals(
    ruleCandidateRows(
      notes.map((notes) => ({ action: "gift_feedback", notes }))
    ).length,
    4
  );
});
