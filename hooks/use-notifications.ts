import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../lib/api";
import { useAuth } from "./use-auth";

/**
 * Hook to fetch notifications for the current user
 */
export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications(user?.id || ""),
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user,
  });
}

/**
 * Hook to fetch unread notification count for the header badge
 */
export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.unreadNotificationCount(user?.id || ""),
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user,
    refetchInterval: 30_000, // Poll every 30s so badge updates even without push
    staleTime: 0, // Always refetch on mount
  });
}

/**
 * Hook for notification mutations (mark read, mark all read)
 */
export function useNotificationMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const markRead = useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationRead(notificationId),
    onSuccess: () => {
      if (!user) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(user.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotificationCount(user.id),
      });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: () => {
      if (!user) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(user.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotificationCount(user.id),
      });
    },
  });

  return { markRead, markAllRead };
}
