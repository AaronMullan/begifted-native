import type { Occasion } from "../lib/api";

/** An occasion guaranteed to carry a real date — the only kind Home features. */
export type DatedOccasion = Occasion & { date: string };

export type HomeOccasionGroups = {
  hero: DatedOccasion | null;
  nextUp: DatedOccasion[];
  horizon: DatedOccasion[];
};

const HERO_COUNT = 1;
const NEXT_UP_COUNT = 4;

/**
 * Split upcoming occasions into the three Home page sections.
 * Assumes input is already sorted ascending by date. Undated occasions can't
 * be counted down to, so they stay off Home entirely (they remain editable on
 * the recipient profile).
 */
export function groupHomeOccasions(occasions: Occasion[]): HomeOccasionGroups {
  const dated = occasions.filter((o): o is DatedOccasion => o.date !== null);
  return {
    hero: dated[0] ?? null,
    nextUp: dated.slice(HERO_COUNT, HERO_COUNT + NEXT_UP_COUNT),
    horizon: dated.slice(HERO_COUNT + NEXT_UP_COUNT),
  };
}

/** Days from today until a YYYY-MM-DD calendar date. */
export function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** Title-case an occasion_type for display. "birthday" → "Birthday" */
export function formatOccasionType(occasionType: string): string {
  return occasionType
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Lowercase form for sentence-style copy: "Jimbob's birthday is coming up." */
export function formatOccasionTypeLower(occasionType: string): string {
  return occasionType.replace(/_/g, " ").toLowerCase();
}

/** Possessive form of a name. Tom → Tom's, James → James'. */
export function possessive(name: string): string {
  if (!name) return "";
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

/**
 * Drop a leading copy of the recipient's name from a raw occasion_type.
 *
 * AI occasion extraction occasionally bakes the recipient's name into the
 * stored type (e.g. "lizzy_birthday" for a recipient named Lizzy). Titles are
 * composed as `${possessive(name)} ${formatOccasionType(type)}`, so the raw
 * name doubles into "Lizzy's Lizzy Birthday". Strip a leading name (with an
 * optional possessive "s") only when a separator follows, so real holidays
 * that merely start with the same letters — "samhain", "christmas" — are left
 * intact.
 */
export function stripRecipientName(occasionType: string, name: string): string {
  const first = name?.trim().split(/\s+/)[0] ?? "";
  if (!first) return occasionType;
  const escaped = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = occasionType.replace(
    new RegExp(`^${escaped}s?['’]?s?[\\s_]+`, "i"),
    ""
  );
  return stripped || occasionType;
}
