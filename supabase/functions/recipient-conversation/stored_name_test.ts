import { assertEquals } from "jsr:@std/assert@1";
import { isPartOfStoredName } from "./utils.ts";

Deno.test(
  "isPartOfStoredName drops names that only repeat the stored one",
  () => {
    assertEquals(isPartOfStoredName("Lena", "Lena Ortiz"), true);
    assertEquals(isPartOfStoredName("lena", "Lena Ortiz"), true);
    assertEquals(isPartOfStoredName("Ortiz", "Lena Ortiz"), true);
    assertEquals(isPartOfStoredName("Lena Ortiz", "Lena Ortiz"), true);
  }
);

Deno.test(
  "isPartOfStoredName keeps a name that adds or changes something",
  () => {
    assertEquals(isPartOfStoredName("Lena Marie Ortiz", "Lena Ortiz"), false);
    assertEquals(isPartOfStoredName("Helena", "Lena Ortiz"), false);
    assertEquals(isPartOfStoredName("Lena Park", "Lena Ortiz"), false);
    assertEquals(isPartOfStoredName("", "Lena Ortiz"), false);
    assertEquals(isPartOfStoredName(undefined, "Lena Ortiz"), false);
    assertEquals(isPartOfStoredName("Lena", undefined), false);
  }
);
