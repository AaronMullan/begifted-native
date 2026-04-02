import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { fetchRecipients } from "../lib/api";
import { useAuth } from "./use-auth";

/**
 * Hook to fetch all recipients for the current user
 */
export function useRecipients() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recipients(user?.id || ""),
    queryFn: () => fetchRecipients(user!.id),
    enabled: !!user,
  });
}
