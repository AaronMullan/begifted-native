import { assertEquals } from "jsr:@std/assert@1";
import {
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
