import { assert, assertEquals } from "jsr:@std/assert@1";
import { deriveCoreOccasions } from "./core-occasions.ts";
import type { CoreOccasionInput } from "./core-occasions.ts";
import { buildDiscoveryAnchors } from "./discovery-anchors.ts";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const todayISO = new Date().toISOString().split("T")[0];

function input(overrides: Partial<CoreOccasionInput>): CoreOccasionInput {
  return {
    relationship: "",
    knownRoles: [],
    birthday: null,
    importantDates: [],
    knownOccasions: [],
    culturalContext: "",
    ...overrides,
  };
}

function keys(candidates: { key: string }[]): string[] {
  return candidates.map((c) => c.key);
}

Deno.test("birthday is a required candidate with a future date", () => {
  const result = deriveCoreOccasions(input({ birthday: "1990-05-05" }));
  const birthday = result.find((c) => c.key === "birthday");
  assert(birthday);
  assertEquals(birthday.required, true);
  assert(ISO.test(birthday.suggestedDate ?? ""));
  assert((birthday.suggestedDate ?? "") >= todayISO);
  assert(/Birthday$/.test(birthday.name));
});

Deno.test("milestone birthday flagged only for milestone ages", () => {
  const nextYear = new Date().getFullYear();
  // A birthday whose next occurrence turns 40 (born nextYear - 40, Dec 31
  // is always upcoming-or-today within the year).
  const result = deriveCoreOccasions(
    input({ birthday: `${nextYear - 40}-12-31` })
  );
  const birthday = result.find((c) => c.key === "birthday")!;
  assertEquals(birthday.isMilestone, true);
  assertEquals(birthday.name, "40th Birthday");
});

Deno.test(
  "no-year birthday (--MM-DD) still yields a required candidate",
  () => {
    const result = deriveCoreOccasions(input({ birthday: "--07-04" }));
    const birthday = result.find((c) => c.key === "birthday")!;
    assertEquals(birthday.name, "Birthday");
    assertEquals(birthday.isMilestone, false);
  }
);

Deno.test("mother relationship yields required Mother's Day", () => {
  const result = deriveCoreOccasions(input({ relationship: "mother" }));
  const md = result.find((c) => c.key === "mothers_day");
  assert(md);
  assertEquals(md.required, true);
  assert((md.suggestedDate ?? "") >= todayISO);
});

Deno.test("mother-in-law yields required Mother's Day", () => {
  const result = deriveCoreOccasions(input({ relationship: "mother-in-law" }));
  assert(keys(result).includes("mothers_day"));
});

Deno.test("explicit knownRoles unlock Father's Day for a spouse", () => {
  const result = deriveCoreOccasions(
    input({ relationship: "husband", knownRoles: ["father"] })
  );
  const fd = result.find((c) => c.key === "fathers_day");
  assert(fd);
  assertEquals(fd.required, true);
});

Deno.test(
  "spouse gets anniversary (date-required) + Valentine's + Christmas",
  () => {
    const result = deriveCoreOccasions(input({ relationship: "wife" }));
    const anniversary = result.find((c) => c.key === "wedding_anniversary");
    assert(anniversary);
    assertEquals(anniversary.suggestedDate, null);
    assertEquals(anniversary.required, false);
    assert(keys(result).includes("valentines_day"));
    assert(keys(result).includes("christmas"));
  }
);

Deno.test("anniversary date resolves from importantDates", () => {
  const result = deriveCoreOccasions(
    input({
      relationship: "husband",
      importantDates: ["wedding anniversary — September 22, 2001"],
    })
  );
  const anniversary = result.find((c) => c.key === "wedding_anniversary")!;
  assert(anniversary.suggestedDate?.endsWith("-09-22"));
  assert((anniversary.suggestedDate ?? "") >= todayISO);
});

Deno.test(
  "friend relationship gets no default Christmas or Valentine's",
  () => {
    const result = deriveCoreOccasions(input({ relationship: "friend" }));
    assertEquals(
      keys(result).filter((k) => k === "christmas" || k === "valentines_day"),
      []
    );
  }
);

Deno.test("cultural context swaps Christmas for a resolvable holiday", () => {
  const result = deriveCoreOccasions(
    input({ relationship: "brother", culturalContext: "celebrates Hanukkah" })
  );
  assert(!keys(result).includes("christmas"));
  const hanukkah = result.find((c) => c.key === "hanukkah");
  if (hanukkah) {
    assert((hanukkah.suggestedDate ?? "") >= todayISO);
  }
});

Deno.test(
  "cultural context naming no known holiday suppresses Christmas",
  () => {
    const result = deriveCoreOccasions(
      input({
        relationship: "sister",
        culturalContext: "does not exchange holiday gifts",
      })
    );
    assert(!keys(result).includes("christmas"));
  }
);

Deno.test("already-tracked occasions are not re-suggested", () => {
  const result = deriveCoreOccasions(
    input({
      relationship: "wife",
      knownOccasions: ["christmas (2026-12-25)", "valentines_day"],
    })
  );
  assert(!keys(result).includes("christmas"));
  assert(!keys(result).includes("valentines_day"));
});

Deno.test("supplied personal dates become candidates", () => {
  const result = deriveCoreOccasions(
    input({
      relationship: "friend",
      importantDates: ["marathon day — 2001-10-12"],
    })
  );
  const personal = result.find((c) => c.key === "personal_1");
  assert(personal);
  assertEquals(personal.name, "Marathon day");
  assert(personal.suggestedDate?.endsWith("-10-12"));
  assert((personal.suggestedDate ?? "") >= todayISO);
});

Deno.test(
  "discovery anchors all carry real future ISO dates and unique keys",
  () => {
    const anchors = buildDiscoveryAnchors();
    assert(anchors.length > 0);
    const seen = new Set<string>();
    for (const anchor of anchors) {
      assert(ISO.test(anchor.date), `${anchor.key} date ${anchor.date}`);
      assert(anchor.date >= todayISO, `${anchor.key} not future`);
      assert(!seen.has(anchor.key));
      seen.add(anchor.key);
    }
  }
);
