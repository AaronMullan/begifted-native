import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { fetchOccasions, fetchAllOccasions } from "../lib/api";
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

/**
 * Hook to fetch every occasion for the current user, including past-dated
 * annual occasions. Callers roll these forward to their next occurrence.
 */
export function useAllOccasions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.allOccasions(user?.id || ""),
    queryFn: () => fetchAllOccasions(user!.id),
    enabled: !!user,
  });
}
