// Re-checks run at the reminder points. The longest gap between them inside
// the reminder window is ~10 days, so 14 covers it with slack.
export const PRICE_FRESH_MS = 14 * 24 * 60 * 60 * 1000;

export type PriceState = "verified" | "may_have_changed" | "hidden";

type PricedSuggestion = {
  price?: number | null;
  price_verified_at?: string | null;
  price_checked_at?: string | null;
};

/**
 * A price is shown only when a product-page read confirmed it within the
 * freshness window. An unread price is the model's estimate, and must not be
 * shown as fact. A later check that couldn't read the page keeps the
 * confirmed price on screen, marked as possibly out of date.
 */
export function priceState(
  suggestion: PricedSuggestion,
  now: number = Date.now()
): PriceState {
  if (!suggestion.price || suggestion.price <= 0) return "hidden";
  if (!suggestion.price_verified_at) return "hidden";
  const verifiedAt = Date.parse(suggestion.price_verified_at);
  if (Number.isNaN(verifiedAt) || now - verifiedAt > PRICE_FRESH_MS) {
    return "hidden";
  }
  const checkedAt = suggestion.price_checked_at
    ? Date.parse(suggestion.price_checked_at)
    : NaN;
  if (!Number.isNaN(checkedAt) && checkedAt > verifiedAt) {
    return "may_have_changed";
  }
  return "verified";
}
