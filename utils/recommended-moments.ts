import { slugifyOccasionName } from "./occasion-slug";

const PARTNER_ROLES =
  /\b(wife|husband|spouse|partner|fianc|girlfriend|boyfriend)\b/;
const MOTHER_ROLES = /mother|\bmom\b|\bgrandma\b|\bnana\b/;
const FATHER_ROLES = /father|\bdad\b|\bgrandpa\b/;

const MAX_CHIPS = 4;

/**
 * The holiday to promote into the recommended row, or null.
 *
 * Only ever fires on an explicit statement. Christmas and Hanukkah already sit
 * in the common row for everyone, so a promotion means "we have a reason to
 * believe this is the one they keep", not "this is the default" — and an
 * unrecognised phrase promotes nothing rather than guessing.
 *
 * Ordering is load-bearing: a named holiday beats a named tradition, so
 * "Jewish, we do Passover" promotes Passover rather than the tradition's usual
 * gift day. Every label here must slug to a key utils/occasion-dates resolves,
 * or the chip costs the user an MM-DD entry.
 *
 * Wider than `resolveWinterHoliday` in the recipient-conversation edge
 * function, which knows only the four December holidays and gates them on the
 * relationship. Where both fire they agree; this one additionally promotes
 * Passover, Eid and Lunar New Year, which that function has no branch for.
 */
const STATED_HOLIDAYS: [RegExp, string][] = [
  [/christmas/, "Christmas"],
  [/hanukkah|chanukah/, "Hanukkah"],
  [/passover|pesach|pesah|seder/, "Passover"],
  [/diwali|deepavali/, "Diwali"],
  [/kwanzaa|kwanza/, "Kwanzaa"],
  [/\beid\b|ramadan/, "Eid al-Fitr"],
  [/lunar new year|chinese new year/, "Lunar New Year"],
  // A stated tradition maps to its principal gifting day. The religion itself
  // is never inferred — the extractor refuses to read one off a name, food or
  // language — but given one the user typed, naming its main gift day is a
  // suggestion they can decline, not a fact we store. Word boundaries keep
  // these off Islamabad, Hindustan and jewelry.
  [/\bmuslims?\b|\bislam\b|\bislamic\b/, "Eid al-Fitr"],
  [/\bjews?\b|\bjewish\b|\bjudaism\b/, "Hanukkah"],
  [/\bhindus?\b|\bhinduism\b/, "Diwali"],
];

function statedHolidayFor(culturalContext: string | null | undefined) {
  const context = (culturalContext ?? "").trim().toLowerCase();
  if (!context) return null;
  return (
    STATED_HOLIDAYS.find(([pattern]) => pattern.test(context))?.[1] ?? null
  );
}

/**
 * Person-specific chips for the Add a Moment drawer: deterministic popular
 * occasions gated by the recipient's relationship (DEV-341), followed by any
 * interest-derived suggestions from the AI discovery flow (DEV-344), minus
 * anything they already have. The deterministic list must work offline and
 * instantly, so it only uses fields already on the client; `interestMoments`
 * arrives async and may be empty.
 */

export function recommendedMomentsFor(
  relationshipType: string | null | undefined,
  existingOccasionTypes: string[],
  interestMoments: string[] = [],
  culturalContext?: string | null
): string[] {
  const relationship = (relationshipType ?? "").toLowerCase();
  const candidates = ["Birthday"];
  if (PARTNER_ROLES.test(relationship)) {
    candidates.push("Anniversary", "Valentine's Day");
  }
  if (MOTHER_ROLES.test(relationship)) {
    candidates.push("Mother's Day");
  }
  if (FATHER_ROLES.test(relationship)) {
    candidates.push("Father's Day");
  }
  const statedHoliday = statedHolidayFor(culturalContext);
  if (statedHoliday) candidates.push(statedHoliday);

  const existing = new Set(
    existingOccasionTypes.map((t) => slugifyOccasionName(t))
  );
  const chips = candidates
    .filter((label) => !existing.has(slugifyOccasionName(label)))
    .slice(0, MAX_CHIPS);

  const seen = new Set([...existing, ...chips.map(slugifyOccasionName)]);
  for (const name of interestMoments) {
    const slug = slugifyOccasionName(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    chips.push(name);
  }
  return chips;
}
