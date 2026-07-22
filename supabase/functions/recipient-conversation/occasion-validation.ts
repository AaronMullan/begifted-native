/**
 * Deterministic validation of model output before display (DEV-310).
 *
 * The model ranks core candidates by key and picks discovery anchors; this
 * module enforces the product rules the model kept violating: required
 * occasions are always present, every displayed discovery suggestion
 * carries a real code-resolved future date, unknown anchor keys are
 * rejected, duplicates are removed, and beta caps (3 primary, 3 discovery)
 * apply. Pure module — keep it free of env access so Deno tests can
 * import it without permissions.
 */

import type { CoreOccasionCandidate } from "./core-occasions.ts";
import type { DiscoveryAnchor } from "./discovery-anchors.ts";
import { isPastISO, isValidISODate } from "./occasion-dates.ts";

export interface OccasionRecommendation {
  type: string;
  name: string;
  suggestedDate: string | null;
  isMilestone: boolean;
  reasoning: string;
}

export interface DiscoverySuggestion {
  type: "interest_based_observance";
  name: string;
  anchorOccasion: string;
  suggestedDate: string;
  reasoning: string;
}

export interface OccasionRecommendations {
  primaryOccasions: OccasionRecommendation[];
  /**
   * Legacy plain names, kept so app builds that predate structured
   * discovery keep rendering (they crash on objects here). Mirrors
   * discoverySuggestions[].name.
   */
  additionalSuggestions: string[];
  discoverySuggestions: DiscoverySuggestion[];
}

const MAX_PRIMARY = 3;
const MAX_DISCOVERY = 3;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function defaultReasoning(candidate: CoreOccasionCandidate): string {
  switch (candidate.key) {
    case "birthday":
      return "Everyone deserves to feel special on their birthday.";
    case "mothers_day":
      return "A dedicated day to celebrate the mom she is.";
    case "fathers_day":
      return "A dedicated day to celebrate the dad he is.";
    case "wedding_anniversary":
      return "A milestone worth marking together every year.";
    case "valentines_day":
      return "A classic moment to celebrate your relationship.";
    default:
      return "A meaningful moment worth planning a gift around.";
  }
}

function assembleFromCandidate(
  candidate: CoreOccasionCandidate,
  reasoning: string
): OccasionRecommendation {
  return {
    type: candidate.type,
    name: candidate.name,
    suggestedDate: candidate.suggestedDate,
    isMilestone: candidate.isMilestone,
    reasoning: reasoning.trim() || defaultReasoning(candidate),
  };
}

/** Keep only a real, non-past ISO date; anything else becomes null. */
function sanitizeDate(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!isValidISODate(raw) || isPastISO(raw)) return null;
  return raw;
}

export function finalizeOccasionRecommendations(
  candidates: CoreOccasionCandidate[],
  anchors: DiscoveryAnchor[],
  parsed: unknown
): OccasionRecommendations {
  const output = (parsed ?? {}) as Record<string, unknown>;
  const rawPrimary = Array.isArray(output.primaryOccasions)
    ? output.primaryOccasions
    : [];
  const rawAdditional = Array.isArray(output.additionalSuggestions)
    ? output.additionalSuggestions
    : [];

  const byKey = new Map(candidates.map((c) => [c.key, c]));
  const byNameSlug = new Map(candidates.map((c) => [slugify(c.name), c]));
  const usedCandidates = new Set<string>();
  const primary: OccasionRecommendation[] = [];
  const seenPrimarySlugs = new Set<string>();

  const pushPrimary = (occasion: OccasionRecommendation) => {
    const slug = slugify(occasion.name);
    if (!slug || seenPrimarySlugs.has(slug)) return;
    seenPrimarySlugs.add(slug);
    primary.push(occasion);
  };

  for (const item of rawPrimary) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key.trim() : "";
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const reasoning = typeof o.reasoning === "string" ? o.reasoning : "";
    const candidate =
      byKey.get(key) ??
      byKey.get(slugify(name)) ??
      byNameSlug.get(slugify(name));
    if (candidate) {
      if (usedCandidates.has(candidate.key)) continue;
      usedCandidates.add(candidate.key);
      pushPrimary(assembleFromCandidate(candidate, reasoning));
      continue;
    }
    // Tolerated pass-through for legacy/custom prompts (playground) that
    // still return free-form occasions. Dates are sanitized, never trusted.
    if (!name) continue;
    pushPrimary({
      type: String(o.type || "custom")
        .replace(/\s+/g, "_")
        .toLowerCase(),
      name,
      suggestedDate: sanitizeDate(o.suggestedDate),
      isMilestone: Boolean(o.isMilestone),
      reasoning,
    });
  }

  // Required candidates must reach the user regardless of what the model
  // returned. Injected at the front so the beta cap can never push one out.
  const missingRequired = candidates.filter(
    (c) => c.required && !usedCandidates.has(c.key)
  );
  for (const candidate of [...missingRequired].reverse()) {
    const slug = slugify(candidate.name);
    if (seenPrimarySlugs.has(slug)) continue;
    seenPrimarySlugs.add(slug);
    primary.unshift(
      assembleFromCandidate(candidate, defaultReasoning(candidate))
    );
  }

  const anchorsByKey = new Map(anchors.map((a) => [a.key, a]));
  const discovery: DiscoverySuggestion[] = [];
  const usedAnchors = new Set<string>();
  const legacyNames: string[] = [];

  for (const item of rawAdditional) {
    if (typeof item === "string") {
      // Legacy/custom prompt output: plain occasion names.
      if (item.trim()) legacyNames.push(item.trim());
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const anchorKey =
      typeof o.anchorOccasion === "string" ? o.anchorOccasion.trim() : "";
    const anchor = anchorsByKey.get(anchorKey);
    // Unknown or unsupported anchor keys are rejected outright.
    if (!anchor || usedAnchors.has(anchor.key)) continue;
    const name =
      typeof o.name === "string" && o.name.trim() ? o.name.trim() : anchor.name;
    // Never a duplicate of a primary occasion or another suggestion.
    if (seenPrimarySlugs.has(slugify(name))) continue;
    usedAnchors.add(anchor.key);
    discovery.push({
      type: "interest_based_observance",
      name,
      anchorOccasion: anchor.key,
      // The catalog date always wins — the model cannot invent dates.
      suggestedDate: anchor.date,
      reasoning: typeof o.reasoning === "string" ? o.reasoning : "",
    });
  }

  const cappedDiscovery = discovery.slice(0, MAX_DISCOVERY);
  const additionalNames =
    cappedDiscovery.length > 0
      ? cappedDiscovery.map((d) => d.name)
      : legacyNames.slice(0, MAX_DISCOVERY);

  return {
    primaryOccasions: primary.slice(0, MAX_PRIMARY),
    additionalSuggestions: additionalNames,
    discoverySuggestions: cappedDiscovery,
  };
}
