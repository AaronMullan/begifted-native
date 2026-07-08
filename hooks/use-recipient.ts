import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { fetchRecipient } from "../lib/api";
import { useAuth } from "./use-auth";
import type { Recipient } from "../types/recipient";

/**
 * Hook to fetch a single recipient by ID
 */
export function useRecipient(
  recipientId: string | undefined,
  options?: Pick<UseQueryOptions<Recipient, Error>, "refetchInterval">
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recipient(user?.id || "", recipientId || ""),
    queryFn: () => fetchRecipient(user!.id, recipientId!),
    enabled: !!user && !!recipientId,
    refetchInterval: options?.refetchInterval,
  });
}
