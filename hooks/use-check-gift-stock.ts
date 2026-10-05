import { checkGiftLinkOnTap } from "../lib/api";
import type { GiftSuggestion } from "../types/recipient";
import { useSubmitGiftFeedback } from "./use-submit-gift-feedback";

/**
 * Re-check a gift's product page before sending the user to it. Stock can run
 * out in the hours between generation and the tap, and the page is the only
 * place that knows. Resolves `true` when the gift turned out to be sold out or
 * gone; the caller should not open the link then.
 *
 * The gift is recorded as a plain `remove`, the same write the removal menu
 * makes. That keeps its slot held in the active band so a Past Gift isn't
 * promoted into it, drops the card, and requests the replacement. `remove`
 * carries no taste signal, so a stock-out doesn't count against the gift in
 * either profile, while the avoid list still keeps it from being suggested
 * again.
 */
export function useCheckGiftStock() {
  const submitFeedback = useSubmitGiftFeedback();

  return async (
    suggestion: GiftSuggestion,
    occasionId?: string | null
  ): Promise<boolean> => {
    const unavailable = await checkGiftLinkOnTap(suggestion.id);
    if (!unavailable) return false;

    submitFeedback.mutate({
      recipientId: suggestion.recipient_id,
      giftSuggestionId: suggestion.id,
      action: "remove",
      occasionId: occasionId ?? suggestion.occasion_id ?? null,
    });
    return true;
  };
}
