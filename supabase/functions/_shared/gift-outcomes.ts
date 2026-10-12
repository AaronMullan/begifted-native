/**
 * Turns gift_feedback outcomes into synthesizer context.
 *
 * The two profiles get deliberately different views of the same rows. A
 * recipient profile may see item titles — a choice is direct taste evidence for
 * that one person. The giver profile spans every recipient, so anything
 * concrete that reaches it leaks into unrelated recipients' suggestions (a toy
 * chosen for a nephew becoming a signal for a spouse). Its context therefore
 * carries prices, relationship tiers and counts, plus only those style tags
 * that held across different relationships; no title or brand is ever passed
 * in, so none can come back out.
 *
 * Intent is derived from `action`, not `signal_type`, matching the CIS builder
 * in be-gifted.
 */

export type FeedbackRow = {
  gift_suggestion_id: string | null;
  recipient_id: string;
  occasion_id: string | null;
  action: string;
  gift_title: string | null;
  price: number | string | null;
  category_tags?: string[] | null;
  created_at: string;
};

export type SuggestionTimingRow = {
  recipient_id: string;
  occasion_id: string | null;
  generated_at: string;
};

/**
 * Feedback is append-only, so a gift's current judgement is its newest row.
 * Free-text "gift_feedback" notes are commentary, not a decision, and would
 * otherwise mask the decision they follow.
 */
export function latestDecisionPerGift(rows: FeedbackRow[]): FeedbackRow[] {
  const latest = new Map<string, FeedbackRow>();
  for (const row of rows) {
    if (row.action === "gift_feedback" || !row.gift_suggestion_id) continue;
    const seen = latest.get(row.gift_suggestion_id);
    if (!seen || row.created_at > seen.created_at) {
      latest.set(row.gift_suggestion_id, row);
    }
  }
  return [...latest.values()];
}

function toPrice(value: number | string | null): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return n != null && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function priceSummary(prices: number[]): string {
  if (prices.length === 0) return "price unknown";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  return min === max ? `$${min}` : `$${min}–$${max} (avg $${avg})`;
}

/**
 * Giver-profile context: what they spend per relationship tier and how many
 * ideas they looked at before committing. Returns "" when nothing was chosen.
 *
 * `relationshipByRecipient` maps recipient id → relationship_type.
 * `suggestions` are the recipients' generated ideas (superseded ones included —
 * they were shown), used to count how many were on offer in the run-up to the
 * choice.
 */
export function buildGiverChoiceContext(
  decisions: FeedbackRow[],
  relationshipByRecipient: Map<string, string | null>,
  suggestions: SuggestionTimingRow[]
): string {
  const chosen = decisions.filter((d) => d.action === "chose");
  if (chosen.length === 0) return "";

  const pricesByTier = new Map<string, number[]>();
  const countByTier = new Map<string, number>();
  for (const c of chosen) {
    const tier =
      relationshipByRecipient.get(c.recipient_id)?.trim().toLowerCase() ||
      "unspecified relationship";
    countByTier.set(tier, (countByTier.get(tier) ?? 0) + 1);
    const price = toPrice(c.price);
    if (price != null) {
      pricesByTier.set(tier, [...(pricesByTier.get(tier) ?? []), price]);
    }
  }

  const tierLines = [...countByTier.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(
      ([tier, count]) =>
        `- ${tier}: ${count} gift${count === 1 ? "" : "s"} chosen, ${priceSummary(
          pricesByTier.get(tier) ?? []
        )}`
    );

  const sameOccasion = (a: FeedbackRow | SuggestionTimingRow, c: FeedbackRow) =>
    a.recipient_id === c.recipient_id &&
    (a.occasion_id ?? null) === (c.occasion_id ?? null);
  // A recurring occasion keeps one id across years, so a choice only counts
  // the ideas generated since the previous choice for that occasion —
  // otherwise every year's ideas pile onto the next year's count.
  const ideasSeen = chosen.map((c) => {
    const since = chosen
      .filter((p) => sameOccasion(p, c) && p.created_at < c.created_at)
      .reduce(
        (latest, p) => (p.created_at > latest ? p.created_at : latest),
        ""
      );
    return suggestions.filter(
      (s) =>
        sameOccasion(s, c) &&
        s.generated_at > since &&
        s.generated_at <= c.created_at
    ).length;
  });
  const seenCounts = ideasSeen.filter((n) => n > 0);
  const decisionLine =
    seenCounts.length > 0
      ? `- Ideas on offer for that occasion when they chose: median ${median(
          seenCounts
        )} (range ${Math.min(...seenCounts)}–${Math.max(...seenCounts)})`
      : "";

  const tendencies = crossRelationshipTendencies(
    chosen,
    relationshipByRecipient
  );
  const tendencyLine =
    tendencies.length > 0
      ? `- Style descriptors of gifts chosen across different relationships: ${tendencies.join(
          ", "
        )}`
      : "";

  return [
    "Gifts actually chosen, by relationship (items deliberately withheld):",
    ...tierLines,
    decisionLine,
    tendencyLine,
  ]
    .filter(Boolean)
    .join("\n");
}

const MAX_TENDENCIES = 8;

const normalizeTag = (tag: string) =>
  tag.trim().toLowerCase().replace(/\s+/g, " ");

const RELATIONSHIP_WORD_SYNONYMS: Record<string, string> = {
  mom: "mother",
  mum: "mother",
  mommy: "mother",
  mummy: "mother",
  momma: "mother",
  mama: "mother",
  ma: "mother",
  dad: "father",
  daddy: "father",
  papa: "father",
  pa: "father",
  grandma: "grandmother",
  grandmom: "grandmother",
  granny: "grandmother",
  nana: "grandmother",
  grandpa: "grandfather",
  granddad: "grandfather",
  grandpop: "grandfather",
  gramps: "grandfather",
  hubby: "husband",
  wifey: "wife",
  bf: "boyfriend",
  gf: "girlfriend",
  sis: "sister",
  sissy: "sister",
  bro: "brother",
  bff: "friend",
  bestie: "friend",
  bestfriend: "friend",
  buddy: "friend",
  pal: "friend",
  colleague: "coworker",
};

// Words that qualify a relationship without naming one; sharing them says
// nothing about whether two relationships are the same kind.
const RELATIONSHIP_FILLER = new Set([
  "my",
  "the",
  "a",
  "an",
  "and",
  "of",
  "from",
  "s",
  "side",
]);

function canonicalRelationshipWord(word: string): string {
  const mapped = RELATIONSHIP_WORD_SYNONYMS[word];
  if (mapped) return mapped;
  // "friends" / "friend"; applied to every word alike, so a stem that isn't a
  // real word ("bos") still matches its own variants.
  return word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word;
}

/**
 * The relationship's words plus the whole string with separators removed, so
 * a compound spelled apart ("co-worker", "step mom") also matches its
 * single-word spelling ("coworker", "stepmom").
 */
function relationshipWords(relationship: string): Set<string> {
  const parts = relationship
    .normalize("NFC")
    .toLowerCase()
    .split(/[^\p{L}\p{M}]+/u)
    .filter(Boolean);
  const words = parts.filter((w) => !RELATIONSHIP_FILLER.has(w));
  if (parts.length > 1) words.push(parts.join(""));
  return new Set(words.map(canonicalRelationshipWord));
}

/**
 * relationship_type is free text, so "friend", "close friend" and "bff" — or
 * "Aunt Sarah" and "Aunt Jane" — name one kind of relationship. Two are treated
 * as the same whenever they share any meaningful word. That over-merges some
 * genuinely different pairs ("brother" / "brother-in-law"), which only ever
 * withholds a tendency, never admits one.
 */
function sameRelationship(a: Set<string>, b: Set<string>): boolean {
  return [...a].some((w) => b.has(w));
}

/**
 * Style tags on chosen gifts that recur across two or more distinct
 * relationship types. This is the only gate between per-recipient taste and
 * the giver profile, so it lives in code rather than in the prompt: a tag seen
 * for one recipient — or for several recipients who share a relationship type —
 * describes those people, not the giver. A recipient with no relationship type
 * can't be shown to differ from anyone, so it contributes nothing.
 */
export function crossRelationshipTendencies(
  chosen: FeedbackRow[],
  relationshipByRecipient: Map<string, string | null>
): string[] {
  const relationshipsByTag = new Map<string, Set<string>[]>();
  for (const c of chosen) {
    const words = relationshipWords(
      relationshipByRecipient.get(c.recipient_id) ?? ""
    );
    if (words.size === 0) continue;
    for (const raw of c.category_tags ?? []) {
      if (typeof raw !== "string") continue;
      const tag = normalizeTag(raw);
      if (!tag) continue;
      relationshipsByTag.set(tag, [
        ...(relationshipsByTag.get(tag) ?? []),
        words,
      ]);
    }
  }
  const spansRelationships = (relationships: Set<string>[]) =>
    relationships.some((a, i) =>
      relationships.slice(i + 1).some((b) => !sameRelationship(a, b))
    );
  return [...relationshipsByTag.entries()]
    .filter(([, relationships]) => spansRelationships(relationships))
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, MAX_TENDENCIES)
    .map(([tag]) => tag);
}

/** Occasion-type lookup for a recipient's choices, keyed by occasion id. */
export type OccasionTypeById = Map<string, string | null>;

const RECIPIENT_BUCKETS: { action: string; heading: string }[] = [
  { action: "already_have", heading: "Already owns (do not repeat)" },
  { action: "not_for_them", heading: "Judged not for them" },
  { action: "product_problem", heading: "Rejected for product quality" },
];

/**
 * Recipient-profile context: chosen items with price and occasion, weighed
 * against the rejection buckets. Titles are fine here — every row belongs to
 * this recipient.
 */
export function buildRecipientOutcomeContext(
  decisions: FeedbackRow[],
  occasionTypes: OccasionTypeById
): string {
  const label = (d: FeedbackRow) => d.gift_title?.trim() || "untitled gift";
  const sections: string[] = [];

  const chosen = decisions.filter((d) => d.action === "chose");
  if (chosen.length > 0) {
    sections.push(
      `Gifts the giver chose for them:\n${chosen
        .map((c) => {
          const price = toPrice(c.price);
          const occasion = c.occasion_id
            ? occasionTypes.get(c.occasion_id)
            : null;
          return `- ${label(c)}${price != null ? ` ($${price})` : ""}${
            occasion ? ` — for ${occasion}` : ""
          }`;
        })
        .join("\n")}`
    );
  }

  for (const { action, heading } of RECIPIENT_BUCKETS) {
    const rows = decisions.filter((d) => d.action === action);
    if (rows.length > 0) {
      sections.push(
        `${heading}:\n${rows.map((r) => `- ${label(r)}`).join("\n")}`
      );
    }
  }

  return sections.join("\n\n");
}
