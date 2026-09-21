import { slugifyOccasionName } from "./occasion-slug";

const PARTNER_ROLES =
  /\b(wife|husband|spouse|partner|fianc|girlfriend|boyfriend)\b/;
const MOTHER_ROLES = /mother|\bmom\b|\bgrandma\b|\bnana\b/;
const FATHER_ROLES = /father|\bdad\b|\bgrandpa\b/;

const MAX_CHIPS = 4;

/**
 * Traditions that make Christmas the wrong December default even though the
 * phrase names no holiday we hold a date for. Matching one suppresses the chip
 * rather than substituting a guess.
 *
 * Deliberately narrow. The fallback has to stay Christmas: the phrase is free
 * text in the user's own words, and the extractor's own examples include
 * "practicing Catholic" and "Italian-American family traditions" — contexts
 * that name no holiday but where Christmas is exactly right. Suppressing on
 * every unmatched phrase would strip the chip from them.
 */
const NON_CHRISTMAS_TRADITIONS =
  /\b(muslim|islam|islamic|eid|ramadan|jewish|judaism|hindu|buddhist|sikh|atheist|agnostic)\b/;

/**
 * The December chip the recipient actually gifts on, from the phrase the user
 * typed. Mirrors `resolveWinterHoliday` in the recipient-conversation edge
 * function so the deterministic chips and the AI-suggested occasions agree on
 * which holiday a person keeps.
 *
 * Two known divergences from that function, both pre-existing: it also gates
 * the default on the relationship being close enough to gift at Christmas, and
 * it suppresses Hanukkah/Diwali once its date tables run out rather than
 * falling back to an approximation.
 */
function winterHolidayFor(culturalContext: string | null | undefined) {
  const context = (culturalContext ?? "").trim().toLowerCase();
  if (!context) return "Christmas";
  if (/christmas/.test(context)) return "Christmas";
  if (/hanukkah|chanukah/.test(context)) return "Hanukkah";
  if (/diwali/.test(context)) return "Diwali";
  if (/kwanzaa|kwanza/.test(context)) return "Kwanzaa";
  if (NON_CHRISTMAS_TRADITIONS.test(context)) return null;
  return "Christmas";
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
