import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { fetchGiftSuggestions } from "../lib/api";

/**
 * Hook to fetch gift suggestions for a recipient
 */
export function useGiftSuggestions(recipientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.giftSuggestions(recipientId || ""),
    queryFn: () => fetchGiftSuggestions(recipientId!),
    enabled: !!recipientId,
  });
}
