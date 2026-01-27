import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { fetchRecipient } from "../lib/api";
import { useAuth } from "./use-auth";

/**
 * Hook to fetch a single recipient by ID
 */
export function useRecipient(recipientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recipient(user?.id || "", recipientId || ""),
    queryFn: () => fetchRecipient(user!.id, recipientId!),
    enabled: !!user && !!recipientId,
  });
}
