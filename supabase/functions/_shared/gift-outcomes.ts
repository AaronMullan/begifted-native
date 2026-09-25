/**
 * Turns gift_feedback outcomes into synthesizer context.
 *
 * The two profiles get deliberately different views of the same rows. A
 * recipient profile may see item titles — a choice is direct taste evidence for
 * that one person. The giver profile spans every recipient, so anything
 * concrete that reaches it leaks into unrelated recipients' suggestions (a toy
 * chosen for a nephew becoming a signal for a spouse). Its context therefore
 * carries prices, relationship tiers and counts only; no title, brand or
 * category is ever passed in, so none can come back out.
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
 * they were shown), used to count how many were on offer by the time of the
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

  const ideasSeen = chosen.map(
    (c) =>
      suggestions.filter(
        (s) =>
          s.recipient_id === c.recipient_id &&
          (s.occasion_id ?? null) === (c.occasion_id ?? null) &&
          s.generated_at <= c.created_at
      ).length
  );
  const seenCounts = ideasSeen.filter((n) => n > 0);
  const decisionLine =
    seenCounts.length > 0
      ? `- Ideas on offer for that occasion when they chose: median ${median(
          seenCounts
        )} (range ${Math.min(...seenCounts)}–${Math.max(...seenCounts)})`
      : "";

  return [
    "Gifts actually chosen, by relationship (items deliberately withheld):",
    ...tierLines,
    decisionLine,
  ]
    .filter(Boolean)
    .join("\n");
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
