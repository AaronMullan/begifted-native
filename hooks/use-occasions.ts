import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { fetchOccasions } from "../lib/api";
import { useAuth } from "./use-auth";

/**
 * Hook to fetch occasions for the current user
 */
export function useOccasions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.occasions(user?.id || ""),
    queryFn: () => fetchOccasions(user!.id),
    enabled: !!user,
  });
}
