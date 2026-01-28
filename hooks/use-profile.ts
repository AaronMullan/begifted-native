import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { fetchProfile } from "../lib/api";
import { useAuth } from "./use-auth";

/**
 * Hook to fetch user profile
 */
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.profile(user?.id || ""),
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });
}
