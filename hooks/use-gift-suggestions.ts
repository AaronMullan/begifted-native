import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { STALE_TIME_SHORT_MS } from "../lib/query-defaults";
import { fetchGiftSuggestions } from "../lib/api";
import type { GiftSuggestion } from "../types/recipient";

/**
 * Hook to fetch gift suggestions for a recipient
 */
export function useGiftSuggestions(
  recipientId: string | undefined,
  options?: Pick<UseQueryOptions<GiftSuggestion[], Error>, "refetchInterval">
) {
  return useQuery({
    queryKey: queryKeys.giftSuggestions(recipientId || ""),
    queryFn: () => fetchGiftSuggestions(recipientId!),
    enabled: !!recipientId,
    staleTime: STALE_TIME_SHORT_MS,
    refetchInterval: options?.refetchInterval,
  });
}
