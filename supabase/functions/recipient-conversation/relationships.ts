/**
 * Best-effort inference of life roles from a free-form relationship_type
 * string. Only covers the unambiguous parent/grandparent vocabulary so the
 * occasion prompt can unlock Mother's/Father's Day for the obvious cases
 * without waiting on richer profile capture. Spouse/sibling/etc. are
 * intentionally not inferred — they don't change the marquee occasions and
 * the LLM already handles them from `relationship` alone.
 */
export function inferRolesFromRelationship(relationship: string): string[] {
  const r = relationship.toLowerCase();
  const roles = new Set<string>();
  if (/\b(mom|mother|mama|mommy|mum)\b/.test(r)) roles.add("mother");
  if (/\b(grandmother|grandma|grammy|granny|nana)\b/.test(r)) {
    roles.add("mother");
    roles.add("grandmother");
  }
  if (/\b(dad|father|papa|daddy)\b/.test(r)) roles.add("father");
  if (/\b(grandfather|grandpa|grampy)\b/.test(r)) {
    roles.add("father");
    roles.add("grandfather");
  }
  return [...roles];
}

/** Facts derived from the user's other recipients (the relationship graph). */
export interface FamilyFacts {
  userHasChildren: boolean;
}

const GENDERED_SPOUSE_ROLE: Record<string, string> = {
  wife: "mother",
  husband: "father",
};

const UNGENDERED_PARTNERS = new Set([
  "spouse",
  "partner",
  "fiancé",
  "fiancée",
  "fiance",
  "fiancee",
]);

/**
 * True when the recipient's own household description explicitly mentions
 * children. The extractor only writes householdContext from explicit
 * statements, so a match here is a captured fact, not an inference.
 */
export function householdMentionsChildren(householdContext: string): boolean {
  return /\b(child|children|kid|kids|son|sons|daughter|daughters|baby|babies|toddler|toddlers)\b/i.test(
    householdContext
  );
}

/**
 * Combine relationship, household, and family-graph facts into gift-relevant
 * roles (DEV-335). Governing rule: derive occasion applicability from all
 * compatible known facts, using the least specific defensible role — never
 * invent biological, legal, marital, or custodial facts. Concretely:
 *
 * - Explicit knownRoles and relationship-derived roles are unioned, never
 *   replaced (an explicit ["wife"] must not suppress other derivation).
 * - Gendered spouse (wife/husband) + user has children → mother/father.
 *   The role describes occasion applicability (Mother's/Father's Day), not
 *   asserted biological parentage.
 * - Ungendered partner (spouse/partner/fiancé(e)) + children → "parent"
 *   only: gender is never guessed, so no gendered day unlocks.
 * - User's parent or parent-in-law + user has children → grandparent role
 *   (they are the children's grandmother/grandfather figure).
 */
export function deriveGiftRelevantRoles(input: {
  relationship: string;
  knownRoles: string[];
  householdContext: string;
  familyFacts: FamilyFacts;
}): string[] {
  const relationship = input.relationship.trim().toLowerCase();
  const roles = new Set<string>(
    [...input.knownRoles, ...inferRolesFromRelationship(relationship)].map(
      (r) => r.toLowerCase()
    )
  );
  const childrenKnown =
    input.familyFacts.userHasChildren ||
    householdMentionsChildren(input.householdContext);
  if (!childrenKnown) return [...roles];

  const genderedRole =
    GENDERED_SPOUSE_ROLE[relationship] ??
    [...roles].map((r) => GENDERED_SPOUSE_ROLE[r]).find(Boolean);
  if (genderedRole) {
    roles.add(genderedRole);
  } else if (UNGENDERED_PARTNERS.has(relationship)) {
    roles.add("parent");
  }

  // Grandparent derivation keys on the relationship being a parent type
  // (mother/father, incl. in-laws) — not on roles derived above, so a
  // spouse-turned-mother is never also marked a grandmother.
  const relationshipRoles = inferRolesFromRelationship(relationship);
  if (relationshipRoles.includes("mother")) roles.add("grandmother");
  if (relationshipRoles.includes("father")) roles.add("grandfather");

  return [...roles];
}

/**
 * Canonicalize common relationship nicknames to a consistent vocabulary before
 * the occasion prompt sees them (e.g. "hubby" → "husband", "mom" → "mother"),
 * so the model reasons from a stable set of terms. Only an exact match of the
 * whole (trimmed, lowercased) relationship is rewritten — phrases like "college
 * roommate" and already-canonical terms pass through unchanged, so no nuance is
 * lost (DEV-160).
 */
const RELATIONSHIP_SYNONYMS: Record<string, string> = {
  hubby: "husband",
  wifey: "wife",
  mom: "mother",
  mum: "mother",
  mommy: "mother",
  mama: "mother",
  dad: "father",
  daddy: "father",
  papa: "father",
  grandma: "grandmother",
  granny: "grandmother",
  nana: "grandmother",
  grandpa: "grandfather",
  grampa: "grandfather",
  gramps: "grandfather",
  sis: "sister",
  bro: "brother",
  gf: "girlfriend",
  bf: "boyfriend",
  "significant other": "partner",
  bestie: "best friend",
  bff: "best friend",
};

export function normalizeRelationship(relationship: string): string {
  const trimmed = relationship.trim();
  return RELATIONSHIP_SYNONYMS[trimmed.toLowerCase()] ?? trimmed;
}
