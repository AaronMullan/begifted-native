import { slugifyOccasionName } from "../hooks/use-occasion-recommendations";

const PARTNER_ROLES =
  /\b(wife|husband|spouse|partner|fianc|girlfriend|boyfriend)\b/;
const MOTHER_ROLES = /mother|\bmom\b|\bgrandma\b|\bnana\b/;
const FATHER_ROLES = /father|\bdad\b|\bgrandpa\b/;

const MAX_CHIPS = 4;

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
  interestMoments: string[] = []
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
  candidates.push("Christmas");

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
