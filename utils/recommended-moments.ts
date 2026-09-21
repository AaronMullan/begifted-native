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
// Plurals and -ism forms are spelled out rather than suffixed with \w*, which
// would swallow unrelated words (islam\w* matches Islamabad). \b after the
// stem keeps "jew" from matching "jewelry".
const NON_CHRISTMAS_TRADITIONS =
  /\b(muslims?|islam|islamic|eid|ramadan|jews?|jewish|judaism|hindus?|hinduism|buddhists?|buddhism|sikhs?|sikhism|atheists?|agnostics?)\b/;

/**
 * The December chip the recipient actually gifts on, from the phrase the user
 * typed. Shares the named-holiday branches with `resolveWinterHoliday` in the
 * recipient-conversation edge function, so a person who keeps Hanukkah is
 * offered it by both the deterministic chips and the AI suggestions.
 *
 * Three divergences from that function, none of them accidental:
 *  - On an unmatched phrase it suppresses and this returns Christmas. Its rule
 *    strips the chip from "practicing Catholic" and "Italian-American family
 *    traditions" — the extractor's own examples — so it is the one that should
 *    move. Until it does, the drawer can show a Christmas chip the AI half
 *    won't propose.
 *  - It gates the default on the relationship being close enough to gift at
 *    Christmas; this doesn't.
 *  - It suppresses Hanukkah/Diwali once its date tables run out rather than
 *    falling back to an approximation.
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
