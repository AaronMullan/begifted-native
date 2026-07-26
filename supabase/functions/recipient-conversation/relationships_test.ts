import { assertEquals } from "jsr:@std/assert@1";
import {
  deriveGiftRelevantRoles,
  householdMentionsChildren,
  inferRolesFromRelationship,
  normalizeRelationship,
} from "./relationships.ts";

Deno.test(
  "inferRolesFromRelationship infers mother from mom vocabulary",
  () => {
    assertEquals(inferRolesFromRelationship("Mom"), ["mother"]);
    assertEquals(inferRolesFromRelationship("my mother"), ["mother"]);
  }
);

Deno.test(
  "inferRolesFromRelationship infers both roles for grandparents",
  () => {
    assertEquals(inferRolesFromRelationship("grandma").sort(), [
      "grandmother",
      "mother",
    ]);
    assertEquals(inferRolesFromRelationship("Grandpa").sort(), [
      "father",
      "grandfather",
    ]);
  }
);

Deno.test(
  "inferRolesFromRelationship infers father from dad vocabulary",
  () => {
    assertEquals(inferRolesFromRelationship("dad"), ["father"]);
    assertEquals(inferRolesFromRelationship("Papa"), ["father"]);
  }
);

Deno.test("inferRolesFromRelationship stays silent for everything else", () => {
  assertEquals(inferRolesFromRelationship("college roommate"), []);
  assertEquals(inferRolesFromRelationship("wife"), []);
  assertEquals(inferRolesFromRelationship(""), []);
});

Deno.test("inferRolesFromRelationship requires whole words", () => {
  // "madam" contains "dam" but not the word "dad"; "mummify" is not "mum".
  assertEquals(inferRolesFromRelationship("madam"), []);
  assertEquals(inferRolesFromRelationship("mummify"), []);
});

function rolesFor(
  overrides: Partial<Parameters<typeof deriveGiftRelevantRoles>[0]>
): string[] {
  return deriveGiftRelevantRoles({
    relationship: "",
    knownRoles: [],
    householdContext: "",
    familyFacts: { userHasChildren: false },
    ...overrides,
  }).sort();
}

Deno.test("wife + user has children derives mother", () => {
  assertEquals(
    rolesFor({
      relationship: "wife",
      knownRoles: ["wife"],
      familyFacts: { userHasChildren: true },
    }),
    ["mother", "wife"]
  );
});

Deno.test("husband + user has children derives father", () => {
  assertEquals(
    rolesFor({
      relationship: "husband",
      familyFacts: { userHasChildren: true },
    }),
    ["father"]
  );
});

Deno.test("ungendered partner + children derives only 'parent'", () => {
  assertEquals(
    rolesFor({
      relationship: "partner",
      familyFacts: { userHasChildren: true },
    }),
    ["parent"]
  );
  assertEquals(
    rolesFor({
      relationship: "spouse",
      familyFacts: { userHasChildren: true },
    }),
    ["parent"]
  );
});

Deno.test("spouse without children evidence derives nothing", () => {
  assertEquals(rolesFor({ relationship: "wife", knownRoles: ["wife"] }), [
    "wife",
  ]);
});

Deno.test("household context children unlock the same derivation", () => {
  assertEquals(
    rolesFor({
      relationship: "wife",
      householdContext: "Lives with the user and their two kids",
    }),
    ["mother"]
  );
});

Deno.test("user's parent + user has children derives grandparent", () => {
  assertEquals(
    rolesFor({
      relationship: "mother",
      familyFacts: { userHasChildren: true },
    }),
    ["grandmother", "mother"]
  );
  assertEquals(
    rolesFor({
      relationship: "father-in-law",
      familyFacts: { userHasChildren: true },
    }),
    ["father", "grandfather"]
  );
});

Deno.test("spouse-derived mother is never also marked grandmother", () => {
  const roles = rolesFor({
    relationship: "wife",
    familyFacts: { userHasChildren: true },
  });
  assertEquals(roles.includes("grandmother"), false);
});

Deno.test("non-family relationships derive nothing from children", () => {
  assertEquals(
    rolesFor({
      relationship: "friend",
      familyFacts: { userHasChildren: true },
    }),
    []
  );
});

Deno.test("explicit roles union with relationship-derived roles", () => {
  assertEquals(rolesFor({ relationship: "grandma", knownRoles: ["Teacher"] }), [
    "grandmother",
    "mother",
    "teacher",
  ]);
});

Deno.test("householdMentionsChildren requires explicit child words", () => {
  assertEquals(
    householdMentionsChildren("Lives with husband and a 6-year-old child"),
    true
  );
  assertEquals(
    householdMentionsChildren("lives with her husband Daryl"),
    false
  );
  assertEquals(householdMentionsChildren("lives with Jackson the dog"), false);
  assertEquals(householdMentionsChildren(""), false);
});

Deno.test("normalizeRelationship canonicalizes exact nickname matches", () => {
  assertEquals(normalizeRelationship("hubby"), "husband");
  assertEquals(normalizeRelationship("  Mom  "), "mother");
  assertEquals(normalizeRelationship("BFF"), "best friend");
});

Deno.test(
  "normalizeRelationship passes phrases and canonical terms through",
  () => {
    assertEquals(normalizeRelationship("college roommate"), "college roommate");
    assertEquals(normalizeRelationship("Mother"), "Mother");
    assertEquals(normalizeRelationship("my mom from work"), "my mom from work");
  }
);
