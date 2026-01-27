import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { fetchDashboardStats } from "../lib/api";
import { useAuth } from "./use-auth";

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.dashboardStats(user?.id || ""),
    queryFn: async () => {
      try {
        return await fetchDashboardStats(user!.id, user?.email);
      } catch {
        return {
          username: user?.email?.split("@")[0] || "",
          recipientsCount: 0,
          upcomingCount: 0,
        };
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
