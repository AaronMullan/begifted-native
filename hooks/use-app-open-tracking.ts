import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "./use-auth";
import { logProductEvent } from "../lib/api";

// A resume within this long of leaving is the same visit (an app switch, a
// glance at another app), not a new open.
const APP_OPEN_GAP_MS = 30 * 60 * 1000;

// iOS can deliver a tap's response just before or just after the "active"
// transition, so a resume waits briefly and then checks for a tap near it.
const NOTIFICATION_TAP_SETTLE_MS = 2000;

// Read at module load, before the auth gate consumes and clears the launch tap.
const launchedFromNotification =
  Platform.OS !== "web" && Notifications.getLastNotificationResponse() !== null;

// Per JS context: one cold start per process, however many sign-ins it sees.
let coldStartLogged = false;
let backgroundedAt: number | null = null;
let lastNotificationTapAt = 0;

/** Called for every applied notification tap, so a resume can attribute itself. */
export function noteNotificationTap(): void {
  lastNotificationTapAt = Date.now();
}

function logColdStart(userId: string): void {
  coldStartLogged = true;
  logProductEvent(userId, "app_opened", {
    cold_start: true,
    from_notification: launchedFromNotification,
  });
}

/**
 * Logs `app_opened` on cold start and on a resume after 30+ minutes away. The
 * gap is measured from when the app left the foreground, not from the last
 * logged open, so a long continuous visit interrupted by a quick app switch
 * stays one open.
 */
export function useAppOpenTracking(): void {
  const { user } = useAuth();
  const userId = user?.id;

  // A process launched in the background (e.g. by a silent push) hasn't been
  // opened yet; the first "active" transition logs its cold start instead.
  useEffect(() => {
    if (!userId || coldStartLogged) return;
    if (AppState.currentState === "active") logColdStart(userId);
  }, [userId]);

  useEffect(() => {
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        backgroundedAt = Date.now();
        return;
      }
      if (state !== "active" || !userId) return;
      if (!coldStartLogged) {
        logColdStart(userId);
        return;
      }
      const leftAt = backgroundedAt;
      backgroundedAt = null;
      if (leftAt === null) return;
      const activeAt = Date.now();
      if (activeAt - leftAt < APP_OPEN_GAP_MS) return;
      settleTimer = setTimeout(() => {
        logProductEvent(userId, "app_opened", {
          cold_start: false,
          from_notification:
            lastNotificationTapAt >= activeAt - NOTIFICATION_TAP_SETTLE_MS,
        });
      }, NOTIFICATION_TAP_SETTLE_MS);
    });

    return () => {
      subscription.remove();
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [userId]);
}
