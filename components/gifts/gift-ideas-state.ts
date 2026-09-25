import type { Occasion } from "../../lib/api/occasions";
import { daysUntil } from "../../utils/home-occasions";
import { getNextOccurrence } from "../../utils/occasion-dates";

export type GiftIdeasEmptyState =
  "generating" | "not_due" | "no_results" | "failed" | "empty";

/** Mirrors the backend cron's DEFAULT_LEAD_DAYS for users with no stored value. */
export const DEFAULT_LEAD_DAYS = 21;

/** Runs finish in about a minute and a half at p90; a start stamp older than
 * this belongs to a run that was killed before it could clear it. */
export const GENERATION_STALE_MS = 10 * 60 * 1000;

/** A killed run's stamp stops meaning "that run failed" after this; nothing
 * on the server is guaranteed to clear it. */
const ABANDONED_STAMP_MS = 24 * 60 * 60 * 1000;

type GenerationOccasion = Pick<
  Occasion,
  | "date"
  | "is_annual"
  | "last_generation_status"
  | "generation_started_at"
  | "fulfilled_at"
>;

/** Days until the occasion's next date, or null when it has no date. */
function daysUntilOccasion(occasion: GenerationOccasion): number | null {
  if (!occasion.date) return null;
  return daysUntil(
    occasion.is_annual ? getNextOccurrence(occasion.date) : occasion.date
  );
}

function stampAgeMs(occasion: GenerationOccasion, now: number): number | null {
  if (!occasion.generation_started_at) return null;
  const started = Date.parse(occasion.generation_started_at);
  return Number.isFinite(started) ? now - started : null;
}

export function isGenerationInFlight(
  occasion: GenerationOccasion,
  now: number
): boolean {
  const age = stampAgeMs(occasion, now);
  return age !== null && age < GENERATION_STALE_MS;
}

/**
 * Whether the stored outcome belongs to the occasion's upcoming date. The
 * cron re-dates an annual row only once its next date is inside the lead
 * window, so until then the row still carries last year's date and outcome.
 */
function isCurrentCycle(occasion: GenerationOccasion): boolean {
  if (!occasion.is_annual || !occasion.date) return true;
  return getNextOccurrence(occasion.date) === occasion.date;
}

/**
 * Which message an empty Gift Ideas list shows, from what the server knows
 * about the occasion's generation. Only meaningful when no gift is visible.
 *
 * An in-window occasion with no recorded run reads as generating: the add flow
 * or the next daily cron pass is due to fill it. A run whose start stamp went
 * stale without clearing reads as failed.
 */
export function giftIdeasEmptyState({
  occasion,
  leadDays,
  remindersEnabled,
  clientGenerating,
  loadFailed,
  now,
}: {
  occasion: GenerationOccasion | null;
  leadDays: number;
  remindersEnabled: boolean;
  /** The screen itself just started a run (add flow, profile update). */
  clientGenerating: boolean;
  loadFailed: boolean;
  now: number;
}): GiftIdeasEmptyState {
  if (loadFailed) return "failed";
  if (clientGenerating) return "generating";
  if (!occasion) return "empty";
  if (isGenerationInFlight(occasion, now)) return "generating";

  const current = isCurrentCycle(occasion);
  if (current) {
    const stampAge = stampAgeMs(occasion, now);
    if (stampAge !== null && stampAge < ABANDONED_STAMP_MS) return "failed";
    if (occasion.last_generation_status === "error") return "failed";
    if (occasion.last_generation_status === "no_results") return "no_results";
    // The cron skips fulfilled occasions: the user already chose a gift.
    if (occasion.fulfilled_at) return "empty";
  }
  // The cron never generates for undated occasions or for users who turned
  // reminders off, however close the date is.
  if (!remindersEnabled) return "empty";
  const days = daysUntilOccasion(occasion);
  if (days === null || days < 0) return "empty";
  if (days > leadDays) return "not_due";
  if (current && occasion.last_generation_status === "success") return "empty";
  return "generating";
}

/**
 * The occasion that decides an unfiltered list's empty state: one with a run
 * in flight if any, otherwise the next upcoming one.
 */
export function pickStateOccasion<T extends GenerationOccasion>(
  occasions: T[],
  now: number
): T | null {
  const inFlight = occasions.find((o) => isGenerationInFlight(o, now));
  if (inFlight) return inFlight;
  let next: T | null = null;
  let nextDays = Infinity;
  for (const o of occasions) {
    const days = daysUntilOccasion(o);
    if (days !== null && days >= 0 && days < nextDays) {
      next = o;
      nextDays = days;
    }
  }
  return next;
}
