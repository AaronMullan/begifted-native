import { useQuery } from "@tanstack/react-query";
import { fetchUserPreferences } from "../lib/api";
import { queryKeys } from "../lib/query-keys";
import { useAuth } from "./use-auth";

export function useUserPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.userPreferences(user?.id ?? ""),
    queryFn: () => fetchUserPreferences(user!.id),
    enabled: !!user?.id,
  });
}
