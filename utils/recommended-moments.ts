import { slugifyOccasionName } from "./occasion-slug";

const PARTNER_ROLES =
  /\b(wife|husband|spouse|partner|fianc|girlfriend|boyfriend)\b/;
const MOTHER_ROLES = /mother|\bmom\b|\bgrandma\b|\bnana\b/;
const FATHER_ROLES = /father|\bdad\b|\bgrandpa\b/;

const MAX_CHIPS = 4;

/**
 * A December chip to promote into the recommended row, or null.
 *
 * Only ever fires on an explicit statement. Christmas and Hanukkah already sit
 * in the common row for everyone, so a promotion here means "we have a reason
 * to think this is the one they keep", not "this is the default". With nothing
 * stated there is no such reason, and the common row has it covered — which is
 * also why an unrecognised phrase promotes nothing rather than guessing.
 *
 * Shares its named branches with `resolveWinterHoliday` in the
 * recipient-conversation edge function, which gates the same choice for
 * AI-suggested occasions. Two differences remain there: it also gates on the
 * relationship being close enough to gift at Christmas, and it suppresses
 * Hanukkah/Diwali once its date tables run out rather than approximating.
 */
function winterHolidayFor(culturalContext: string | null | undefined) {
  const context = (culturalContext ?? "").trim().toLowerCase();
  if (!context) return null;
  if (/christmas/.test(context)) return "Christmas";
  if (/hanukkah|chanukah/.test(context)) return "Hanukkah";
  if (/diwali/.test(context)) return "Diwali";
  if (/kwanzaa|kwanza/.test(context)) return "Kwanzaa";
  return null;
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
  const winterHoliday = winterHolidayFor(culturalContext);
  if (winterHoliday) candidates.push(winterHoliday);

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
