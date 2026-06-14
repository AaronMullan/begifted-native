import type { Occasion } from "../lib/api";
import { getNextOccurrence } from "./occasion-dates";
import { daysUntil } from "./home-occasions";

/** A recipient's soonest upcoming occasion, ready for display. */
export type UpcomingOccasion = {
  occasionType: string;
  /** Next future occurrence as YYYY-MM-DD. */
  date: string;
};

/** Only treat explicit ISO dates as something we can display. */
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Compute the soonest upcoming occasion for a recipient, combining their
 * birthday with any saved occasions. Annual occasions (and birthdays) are
 * rolled forward to their next occurrence; one-time occasions are only
 * considered if they are still in the future. Returns null when nothing is
 * upcoming, so the caller can show an empty state.
 */
export function getNextUpcomingOccasion(
  birthday: string | undefined,
  occasions: Occasion[]
): UpcomingOccasion | null {
  const candidates: UpcomingOccasion[] = [];

  if (birthday) {
    const next = getNextOccurrence(birthday);
    if (ISO_DATE_ONLY.test(next)) {
      candidates.push({ occasionType: "birthday", date: next });
    }
  }

  for (const occasion of occasions) {
    if (occasion.is_annual) {
      const next = getNextOccurrence(occasion.date);
      if (ISO_DATE_ONLY.test(next)) {
        candidates.push({ occasionType: occasion.occasion_type, date: next });
      }
    } else if (
      ISO_DATE_ONLY.test(occasion.date) &&
      daysUntil(occasion.date) >= 0
    ) {
      candidates.push({
        occasionType: occasion.occasion_type,
        date: occasion.date,
      });
    }
  }

  if (candidates.length === 0) return null;

  // All candidate dates are full future YYYY-MM-DD strings, so lexicographic
  // order matches chronological order — the first is the soonest.
  candidates.sort((a, b) => a.date.localeCompare(b.date));
  return candidates[0];
}
