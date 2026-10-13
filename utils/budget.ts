/**
 * One line for a recipient's spending preference. A stored maximum outranks
 * the no-limit flag (as it does wherever the budget is read), so the flag only
 * shows when no maximum is set. Returns null when nothing is set.
 */
export function formatBudget(
  min: number | null | undefined,
  max: number | null | undefined,
  noCeiling: boolean | null | undefined
): string | null {
  if (max != null) {
    return min != null ? `$${min}–$${max}` : `Up to $${max}`;
  }
  if (noCeiling) {
    return min != null ? `From $${min} · No set limit` : "No set limit";
  }
  return min != null ? `From $${min}` : null;
}
