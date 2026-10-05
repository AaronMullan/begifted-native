import { useQueryClient } from "@tanstack/react-query";
import { checkGiftLinkOnTap, triggerGiftBackfill } from "../lib/api";
import { queryKeys } from "../lib/query-keys";
import type { GiftSuggestion } from "../types/recipient";
import { emptySlots, pollForBackfill } from "./use-submit-gift-feedback";

/**
 * Re-check a gift's product page before sending the user to it. Stock can run
 * out in the hours between generation and the tap, and the page is the only
 * place that knows. Resolves `true` when the gift turned out to be sold out or
 * gone: the backend has already retired it, so it's dropped from the list and
 * its slot refilled the same way a removal refills one. The caller should not
 * open the link in that case.
 */
export function useCheckGiftStock() {
  const queryClient = useQueryClient();

  return async (
    suggestion: GiftSuggestion,
    occasionId?: string | null
  ): Promise<boolean> => {
    const retired = await checkGiftLinkOnTap(suggestion.id);
    if (!retired) return false;

    const key = queryKeys.giftSuggestions(suggestion.recipient_id);
    queryClient.setQueryData<GiftSuggestion[]>(key, (old) =>
      (old ?? []).filter((s) => s.id !== suggestion.id)
    );
    const remaining = queryClient.getQueryData<GiftSuggestion[]>(key) ?? [];
    if (emptySlots(remaining, occasionId) > 0) {
      triggerGiftBackfill(suggestion.recipient_id, occasionId);
      pollForBackfill(queryClient, suggestion.recipient_id, occasionId);
    }
    return true;
  };
}
