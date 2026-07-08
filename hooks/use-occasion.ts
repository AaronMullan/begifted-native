import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { fetchOccasion } from "../lib/api";

/**
 * Hook to fetch a single occasion by ID
 */
export function useOccasion(occasionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.occasion(occasionId || ""),
    queryFn: () => fetchOccasion(occasionId!),
    enabled: !!occasionId,
  });
}
