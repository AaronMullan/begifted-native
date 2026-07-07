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
