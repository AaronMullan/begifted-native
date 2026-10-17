/**
 * Standing rules a giver writes in gift feedback ("No food items") become
 * `Avoid: …` entries on recipients.avoid_list — the same form the person-page
 * update note writes — which gift generation treats as hard category blocks.
 */

export const AVOID_PREFIX = "Avoid: ";

/** Notes explaining these decisions are about the item, its listing or its
 * price, never a rule about the person. */
export const NON_RULE_DECISIONS = [
  "already_have",
  "product_problem",
  "price_off",
];

// A rule always says no in some form, often as a verb ("avoid", "skip",
// "hates") or "nothing"; typed fast it loses the apostrophe
// ("doesnt", "wouldnt"), hence the bare "nt". Over-matching ("want") only
// sends the note on to the model. Notes without one — "Ear plugs", "Outdoor
// glassware" — are fragments the model would otherwise read as a category.
const NEGATION =
  /\b(?:no|not|never|none|nothing|avoid|skip|stop|hates?|dislikes?|allergic|without)\b|n['’]?t\b/i;

/** Feedback rows a rule could come from: every decision row, for pairing, and
 * only the notes that say no. */
export function ruleCandidateRows<
  T extends { action: string; notes?: string | null },
>(rows: T[]): T[] {
  return rows.filter(
    (r) => r.action !== "gift_feedback" || NEGATION.test(r.notes ?? "")
  );
}

export const NOTE_RULES_PROMPT = `You read notes a gift giver wrote about gift suggestions for one person, and pull out the standing rules they state about what that person should never be given.

A rule is a whole category the giver rules out for this person, stated outright or by a lasting fact that rules it out:
- "No food items" -> "food items"
- "No board games for Michelle" -> "board games"
- "No kitchen utensils. He doesn't cook much" -> "kitchen utensils"
- "I wouldn't buy her clothes. She likes to pick out her own clothes." -> "clothes"
- "He does not need any camping stuff" -> "camping gear"
- "Due to his mobility issues, he is no longer able to garden" -> "gardening gear"

Not a rule — return nothing for these:
- Remarks about one item: "Too utilitarian", "Not worth the price", "Not her style", "Boring", "Too young", "Similar item", "Doesn't need a lamp".
- Anything about the product, listing, price or website: "Website won't load", "It's a different product than described".
- Requests for more of something: "Something similar".
- Bare item names or fragments with no stated "no", "never" or "doesn't": "Ear plugs", "Garden shears", "This collection of books".
- Things the person already owns: "Already have good headphones", "We have a basketball hoop". Owning one does not rule out the category.
- Why one item is wrong, even when it names its category: "An alarm clock feels like work", "They work out at home, no need for a bag".

Name each category in two to four plain lowercase words, as broad as the note says and no broader: "No frames" is "picture frames", not "home decor". Return only rules not already covered by the existing rules you are given. When unsure, leave it out — every rule you return blocks a whole category from now on.

Give a verdict for every note, in order. "kind" is "rule" for a standing rule about the person, "item" for a remark about one gift, "product" for a listing, price or website problem, and "other" for anything else. Return ONLY valid JSON: {"notes": [{"note": "<the note>", "kind": "rule" | "item" | "product" | "other", "rule": "<category>" or null}]}`;

/** The model's reply as clean category names, minus any it repeated a verb on
 * ("no food items") or that are already on the list. */
export function parseNoteRules(raw: string, existing: string[]): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      raw
        .trim()
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, "")
    );
  } catch {
    return [];
  }
  const verdicts = (parsed as { notes?: unknown })?.notes;
  if (!Array.isArray(verdicts)) return [];
  const seen = new Set(existing.map((e) => e.trim().toLowerCase()));
  const out: string[] = [];
  for (const v of verdicts) {
    const { kind, rule: r } = (v ?? {}) as { kind?: unknown; rule?: unknown };
    if (kind !== "rule" || typeof r !== "string") continue;
    const value = r
      .trim()
      .replace(/^(?:avoid|no)\s+/i, "")
      .trim();
    const key = `${AVOID_PREFIX}${value}`.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/** Append-only: a rule leaves the list only when someone removes it, never
 * because a later run didn't restate it. Null when nothing is new. */
export function mergeNoteRules(
  current: string[] | null,
  rules: string[]
): string[] | null {
  const merged = [...(current ?? [])];
  const seen = new Set(merged.map((e) => e.trim().toLowerCase()));
  let added = false;
  for (const rule of rules) {
    const entry = `${AVOID_PREFIX}${rule}`;
    if (seen.has(entry.toLowerCase())) continue;
    seen.add(entry.toLowerCase());
    merged.push(entry);
    added = true;
  }
  return added ? merged : null;
}
