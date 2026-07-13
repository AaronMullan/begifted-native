import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "./use-auth";
import { queryKeys } from "../lib/query-keys";
import {
  needsPushPermissionPrompt,
  registerForPushNotifications,
  unregisterPushToken,
} from "../lib/push-notifications";

// "Not now" on the pre-permission explainer is remembered so the sheet doesn't
// reappear every launch; the OS-level ask is preserved for a future
// re-engagement surface (e.g. notification settings).
const PUSH_INTRO_DECLINED_KEY = "begifted-push-intro-declined";

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

export type PushIntroControls = {
  /** Render the pre-permission explainer when true. */
  introVisible: boolean;
  /** User agreed — fire the OS prompt and register. */
  acceptIntro: () => void;
  /** User declined — dismiss and remember so we don't nag every launch. */
  declineIntro: () => void;
};

export function usePushNotifications(): PushIntroControls {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null>(null);
  const [introVisible, setIntroVisible] = useState(false);

  // Register/unregister based on auth state. The OS permission prompt must be
  // preceded by the in-app explainer, so when a prompt would fire we show the
  // sheet instead of registering; registration runs on acceptance.
  useEffect(() => {
    if (user?.id && user.id !== previousUserId.current) {
      previousUserId.current = user.id;
      (async () => {
        if (await needsPushPermissionPrompt()) {
          const declined = await AsyncStorage.getItem(PUSH_INTRO_DECLINED_KEY);
          if (!declined) setIntroVisible(true);
          return;
        }
        // Already granted (or permanently denied): same silent path as before.
        await registerForPushNotifications(user.id);
      })().catch((err) => console.error("[push] Registration failed:", err));
    } else if (!user && previousUserId.current) {
      unregisterPushToken().catch((err) =>
        console.error("[push] Unregistration failed:", err)
      );
      previousUserId.current = null;
    }
  }, [user]);

  const acceptIntro = () => {
    setIntroVisible(false);
    if (user?.id) {
      registerForPushNotifications(user.id).catch((err) =>
        console.error("[push] Registration failed:", err)
      );
    }
  };

  const declineIntro = () => {
    setIntroVisible(false);
    AsyncStorage.setItem(PUSH_INTRO_DECLINED_KEY, "true").catch(() => {
      // Best-effort; worst case the explainer shows again next launch.
    });
  };

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
          const recipientId = data.recipientId as string;
          // Invalidate the target's cached suggestions before navigating so the
          // gifts screen refetches on mount instead of showing the previously
          // cached (old) list. Without this, the still-fresh query is served and
          // the tap "lands on old gifts" until the cache goes stale (DEV-208).
          queryClient.invalidateQueries({
            queryKey: queryKeys.giftSuggestions(recipientId),
          });
          const occasionId = data.occasionId as string | undefined;
          const query = occasionId
            ? `?tab=gifts&occasionId=${occasionId}`
            : `?tab=gifts`;
          router.push(`/contacts/${recipientId}${query}`);
        }
      }
    );

    return () => subscription.remove();
  }, [queryClient]);

  // Clear badge when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        Notifications.setBadgeCountAsync(0);
      }
    });

    return () => subscription.remove();
  }, []);

  return { introVisible, acceptIntro, declineIntro };
}
