import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "./use-auth";
import { queryKeys } from "../lib/query-keys";
import {
  registerForPushNotifications,
  unregisterPushToken,
} from "../lib/push-notifications";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Set up Android notification channel
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("gift-suggestions", {
    name: "Gift Suggestions",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
}

export function usePushNotifications(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null>(null);

  // Register/unregister based on auth state
  useEffect(() => {
    if (user?.id && user.id !== previousUserId.current) {
      previousUserId.current = user.id;
      registerForPushNotifications(user.id);
    } else if (!user && previousUserId.current) {
      unregisterPushToken();
      previousUserId.current = null;
    }
  }, [user]);

  // Invalidate notification cache when a push is received in foreground
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.unreadNotificationCount(user.id),
        });
      }
    });

    return () => subscription.remove();
  }, [user?.id, queryClient]);

  // Handle notification taps → deep link to recipient screen
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.recipientId) {
          router.push(`/contacts/${data.recipientId}`);
        }
      },
    );

    return () => subscription.remove();
  }, []);

  // Clear badge when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        Notifications.setBadgeCountAsync(0);
      }
    });

    return () => subscription.remove();
  }, []);
}
