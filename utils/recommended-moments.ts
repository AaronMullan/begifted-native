import { slugifyOccasionName } from "../hooks/use-occasion-recommendations";

const PARTNER_ROLES =
  /\b(wife|husband|spouse|partner|fianc|girlfriend|boyfriend)\b/;
const MOTHER_ROLES = /mother|\bmom\b|\bgrandma\b|\bnana\b/;
const FATHER_ROLES = /father|\bdad\b|\bgrandpa\b/;

const MAX_CHIPS = 4;

/**
 * Deterministic person-specific chips for the Add a Moment drawer (DEV-341):
 * popular occasions gated by the recipient's relationship, minus anything
 * they already have. Interest-derived suggestions (Record Store Day, …) stay
 * with the AI discovery flow in intake; this list must work offline and
 * instantly, so it only uses fields already on the client.
 */
export function recommendedMomentsFor(
  relationshipType: string | null | undefined,
  existingOccasionTypes: string[]
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
  return candidates
    .filter((label) => !existing.has(slugifyOccasionName(label)))
    .slice(0, MAX_CHIPS);
}
