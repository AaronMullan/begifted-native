import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname } from "expo-router";
import { useAuth } from "./use-auth";
import { useAppConfig } from "./use-app-config";
import { useRecipients } from "./use-recipients";

const SEEN_KEY_PREFIX = "@begifted/invites_announcement_seen/";

type SeenState = { userId: string; seen: boolean };

/**
 * The one-time invites announcement shown in the What's New card. Switching
 * invites on doesn't ship an OTA, so the card's update trigger never fires
 * for it. It waits for Home and at least one person so a new user meets it
 * after adding their first person rather than mid-onboarding; existing users
 * already qualify and see it on their next visit to Home.
 */
export function useInvitesAnnouncement(blocked: boolean) {
  const { user } = useAuth();
  const { data: appConfig } = useAppConfig();
  const { data: recipients } = useRecipients();
  const pathname = usePathname();
  const [seenState, setSeenState] = useState<SeenState | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    AsyncStorage.getItem(SEEN_KEY_PREFIX + userId)
      .catch(() => null)
      .then((value) => {
        if (!cancelled) setSeenState({ userId, seen: value === "true" });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const visible =
    !blocked &&
    !!userId &&
    seenState?.userId === userId &&
    !seenState.seen &&
    appConfig?.invites_enabled === true &&
    (recipients?.length ?? 0) > 0 &&
    pathname === "/dashboard";

  const markSeen = () => {
    if (!userId) return;
    setSeenState({ userId, seen: true });
    AsyncStorage.setItem(SEEN_KEY_PREFIX + userId, "true").catch(() => {
      // Worst case the announcement shows once more on a later launch.
    });
  };

  return { visible, markSeen };
}
