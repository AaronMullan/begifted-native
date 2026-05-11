import type { Occasion } from "../lib/api";

export type HomeOccasionGroups = {
  hero: Occasion | null;
  nextUp: Occasion[];
  horizon: Occasion[];
};

const HERO_COUNT = 1;
const NEXT_UP_COUNT = 4;

/**
 * Split upcoming occasions into the three Home page sections.
 * Assumes input is already sorted ascending by date.
 */
export function groupHomeOccasions(occasions: Occasion[]): HomeOccasionGroups {
  return {
    hero: occasions[0] ?? null,
    nextUp: occasions.slice(HERO_COUNT, HERO_COUNT + NEXT_UP_COUNT),
    horizon: occasions.slice(HERO_COUNT + NEXT_UP_COUNT),
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

/** "May 5" style short month + day. */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
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
