import { useQuery } from "@tanstack/react-query";
import { fetchSentInvites } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useSentInvites(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invites(userId ?? ""),
    queryFn: () => fetchSentInvites(userId!),
    enabled: !!userId,
  });
}
