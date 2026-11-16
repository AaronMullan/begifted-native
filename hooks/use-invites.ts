import { useQuery } from "@tanstack/react-query";
import { fetchIsAdmin, fetchSentInvites } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAppConfig } from "@/hooks/use-app-config";
import { useAuth } from "@/hooks/use-auth";

export function useSentInvites(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invites(userId ?? ""),
    queryFn: () => fetchSentInvites(userId!),
    enabled: !!userId,
  });
}

/**
 * Invites are on for everyone once the global switch is on, and for admins
 * before then so the flow can be verified on device against production.
 * Mirrors the check in the `create_invite` RPC.
 */
export function useInvitesEnabled() {
  const { user } = useAuth();
  const configQuery = useAppConfig();
  const adminQuery = useQuery({
    queryKey: queryKeys.isAdmin(user?.id ?? ""),
    queryFn: () => fetchIsAdmin(user!.id),
    enabled: !!user?.id,
  });

  const switchOn = configQuery.data?.invites_enabled === true;
  return {
    enabled: switchOn || adminQuery.data === true,
    isPending:
      configQuery.isPending ||
      (!switchOn && !!user?.id && adminQuery.isPending),
  };
}
