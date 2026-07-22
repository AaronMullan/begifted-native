import { assert, assertEquals } from "jsr:@std/assert@1";
import { finalizeOccasionRecommendations } from "./occasion-validation.ts";
import type { CoreOccasionCandidate } from "./core-occasions.ts";
import type { DiscoveryAnchor } from "./discovery-anchors.ts";

const CANDIDATES: CoreOccasionCandidate[] = [
  {
    key: "birthday",
    type: "birthday",
    name: "40th Birthday",
    suggestedDate: "2027-05-05",
    isMilestone: true,
    required: true,
  },
  {
    key: "mothers_day",
    type: "relationship_based_occasion",
    name: "Mother's Day",
    suggestedDate: "2027-05-09",
    isMilestone: false,
    required: true,
  },
  {
    key: "wedding_anniversary",
    type: "relationship_based_occasion",
    name: "Wedding Anniversary",
    suggestedDate: null,
    isMilestone: false,
    required: false,
  },
  {
    key: "christmas",
    type: "major_gifting_holiday",
    name: "Christmas",
    suggestedDate: "2026-12-25",
    isMilestone: false,
    required: false,
  },
];

const ANCHORS: DiscoveryAnchor[] = [
  { key: "winter_solstice", name: "Winter Solstice", date: "2026-12-21" },
  { key: "earth_day", name: "Earth Day", date: "2027-04-22" },
];

Deno.test(
  "required occasions are re-injected when the model drops them",
  () => {
    const result = finalizeOccasionRecommendations(CANDIDATES, ANCHORS, {
      primaryOccasions: [
        { key: "christmas", reasoning: "Family holiday." },
        { key: "wedding_anniversary", reasoning: "Your day together." },
      ],
      additionalSuggestions: [],
    });
    const names = result.primaryOccasions.map((o) => o.name);
    assert(names.includes("40th Birthday"));
    assert(names.includes("Mother's Day"));
    // Required occasions injected at the front so the cap can't push them out.
    assertEquals(names.slice(0, 2), ["40th Birthday", "Mother's Day"]);
    assertEquals(result.primaryOccasions.length, 3);
  }
);

Deno.test(
  "candidate data wins over model-supplied dates and milestone flags",
  () => {
    const result = finalizeOccasionRecommendations(CANDIDATES, ANCHORS, {
      primaryOccasions: [
        {
          key: "birthday",
          suggestedDate: "2020-01-01",
          isMilestone: false,
          reasoning: "Big day.",
        },
      ],
    });
    const birthday = result.primaryOccasions.find(
      (o) => o.name === "40th Birthday"
    )!;
    assertEquals(birthday.suggestedDate, "2027-05-05");
    assertEquals(birthday.isMilestone, true);
    assertEquals(birthday.reasoning, "Big day.");
  }
);

Deno.test("date-required candidates keep a null date", () => {
  const result = finalizeOccasionRecommendations(CANDIDATES, ANCHORS, {
    primaryOccasions: [
      { key: "wedding_anniversary", reasoning: "Your day together." },
    ],
  });
  const anniversary = result.primaryOccasions.find(
    (o) => o.name === "Wedding Anniversary"
  )!;
  assertEquals(anniversary.suggestedDate, null);
});

Deno.test("unknown anchor keys are rejected; catalog date always wins", () => {
  const result = finalizeOccasionRecommendations(CANDIDATES, ANCHORS, {
    primaryOccasions: [{ key: "birthday", reasoning: "r" }],
    additionalSuggestions: [
      {
        anchorOccasion: "last_ski_day",
        name: "Last Ski Day",
        suggestedDate: "2027-03-30",
        reasoning: "Loves skiing.",
      },
      {
        anchorOccasion: "winter_solstice",
        name: "Winter Solstice — Ski Season Kickoff",
        suggestedDate: "1999-01-01",
        reasoning: "Start of ski season.",
      },
    ],
  });
  assertEquals(result.discoverySuggestions.length, 1);
  const suggestion = result.discoverySuggestions[0];
  assertEquals(suggestion.anchorOccasion, "winter_solstice");
  assertEquals(suggestion.suggestedDate, "2026-12-21");
  assertEquals(suggestion.name, "Winter Solstice — Ski Season Kickoff");
  assertEquals(result.additionalSuggestions, [
    "Winter Solstice — Ski Season Kickoff",
  ]);
});

Deno.test(
  "duplicate anchors and duplicate primaries are removed; caps apply",
  () => {
    const result = finalizeOccasionRecommendations(CANDIDATES, ANCHORS, {
      primaryOccasions: [
        { key: "birthday", reasoning: "a" },
        { key: "birthday", reasoning: "b" },
        { key: "mothers_day", reasoning: "c" },
        { key: "christmas", reasoning: "d" },
        { key: "wedding_anniversary", reasoning: "e" },
      ],
      additionalSuggestions: [
        { anchorOccasion: "earth_day", name: "Earth Day", reasoning: "x" },
        {
          anchorOccasion: "earth_day",
          name: "Earth Day Again",
          reasoning: "y",
        },
      ],
    });
    assertEquals(result.primaryOccasions.length, 3);
    assertEquals(result.discoverySuggestions.length, 1);
  }
);

Deno.test(
  "empty model output falls back to required candidates with stock copy",
  () => {
    const result = finalizeOccasionRecommendations(
      CANDIDATES.filter((c) => c.required),
      ANCHORS,
      {}
    );
    assertEquals(
      result.primaryOccasions.map((o) => o.name),
      ["40th Birthday", "Mother's Day"]
    );
    for (const occasion of result.primaryOccasions) {
      assert(occasion.reasoning.length > 0);
    }
    assertEquals(result.discoverySuggestions, []);
    assertEquals(result.additionalSuggestions, []);
  }
);

Deno.test("legacy string suggestions (custom/v6 prompts) pass through", () => {
  const result = finalizeOccasionRecommendations(CANDIDATES, ANCHORS, {
    primaryOccasions: [
      {
        type: "interest_based_observance",
        name: "Record Store Day",
        suggestedDate: "2999-04-17",
        isMilestone: false,
        reasoning: "Vinyl collector.",
      },
    ],
    additionalSuggestions: ["National Running Day"],
  });
  // Unmatched free-form primary tolerated (playground/custom prompts)…
  assert(result.primaryOccasions.some((o) => o.name === "Record Store Day"));
  // …but required candidates still lead.
  assertEquals(result.primaryOccasions[0].name, "40th Birthday");
  assertEquals(result.additionalSuggestions, ["National Running Day"]);
  assertEquals(result.discoverySuggestions, []);
});

Deno.test(
  "model-supplied past or invalid dates on pass-through are nulled",
  () => {
    const result = finalizeOccasionRecommendations([], ANCHORS, {
      primaryOccasions: [
        {
          name: "Some Day",
          type: "custom",
          suggestedDate: "1999-02-30",
          reasoning: "r",
        },
      ],
    });
    assertEquals(result.primaryOccasions[0].suggestedDate, null);
  }
);
