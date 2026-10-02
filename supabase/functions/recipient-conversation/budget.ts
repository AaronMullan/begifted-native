// A single-anchor amount (e.g. "around $150") should yield a usable range so
// gift generation isn't pinned to one exact price. If extraction still
// collapses min === max, expand it around the anchor (0.8x–1.25x, snapped to
// $5). Also coerces string/"null" values to numbers. DEV-100.
// Operates only on freshly-extracted output — it never touches stored data.
export function normalizeBudgetRange(data: {
  gift_budget_min?: number | string | null;
  gift_budget_max?: number | string | null;
  gift_budget_no_ceiling?: unknown;
}): void {
  const toNumber = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "" || v === "null") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const min = toNumber(data.gift_budget_min);
  const max = toNumber(data.gift_budget_max);

  // Persist coerced numeric values (or null) back onto the object.
  if ("gift_budget_min" in data) data.gift_budget_min = min;
  if ("gift_budget_max" in data) data.gift_budget_max = max;

  // A stated maximum is a ceiling, so the two can't both hold; the number is
  // the more specific answer and wins.
  if ("gift_budget_no_ceiling" in data) {
    const flag = data.gift_budget_no_ceiling;
    data.gift_budget_no_ceiling =
      (flag === true || flag === "true") && max === null;
  }

  // Only intervene on a collapsed single anchor: both set, equal, positive.
  if (min === null || max === null || min !== max || min <= 0) return;

  const anchor = min;
  data.gift_budget_min = Math.floor((anchor * 0.8) / 5) * 5;
  data.gift_budget_max = Math.ceil((anchor * 1.25) / 5) * 5;
  console.log(
    `Budget collapsed to single value ${anchor}; expanded to ${data.gift_budget_min}-${data.gift_budget_max}`
  );
}
