import { assertEquals } from "jsr:@std/assert@1";
import { isPartOfStoredName } from "./utils.ts";

Deno.test("isPartOfStoredName drops a single word from the stored name", () => {
  assertEquals(isPartOfStoredName("Lena", "Lena Ortiz"), true);
  assertEquals(isPartOfStoredName("lena", "Lena Ortiz"), true);
  assertEquals(isPartOfStoredName("Ortiz", "Lena Ortiz"), true);
  assertEquals(isPartOfStoredName("Mary", "Mary-Kate Olsen"), true);
  assertEquals(isPartOfStoredName("Mary-Kate", "Mary Kate Olsen"), true);
  assertEquals(isPartOfStoredName("Zoe", "Zoë Ortiz"), true);
  assertEquals(isPartOfStoredName("O'Brien", "Sean O’Brien"), true);
});

Deno.test(
  "isPartOfStoredName keeps a name that adds or changes something",
  () => {
    assertEquals(isPartOfStoredName("Lena Marie Ortiz", "Lena Ortiz"), false);
    assertEquals(isPartOfStoredName("Lena Ortiz", "Lena Marie Ortiz"), false);
    assertEquals(isPartOfStoredName("Helena", "Lena Ortiz"), false);
    assertEquals(isPartOfStoredName("Lena Park", "Lena Ortiz"), false);
    assertEquals(isPartOfStoredName("", "Lena Ortiz"), false);
    assertEquals(isPartOfStoredName(undefined, "Lena Ortiz"), false);
    assertEquals(isPartOfStoredName("Lena", undefined), false);
  }
);
