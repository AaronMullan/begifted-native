import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import type { AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "./use-auth";
import { logProductEvent } from "../lib/api";

// A resume within this long of leaving is the same visit (an app switch, a
// glance at another app), not a new open.
const APP_OPEN_GAP_MS = 30 * 60 * 1000;

// iOS can deliver a tap's response just before or just after the "active"
// transition, so an open that follows a transition waits briefly and then
// checks for a tap near it.
const NOTIFICATION_TAP_SETTLE_MS = 2000;

// Read at module load, before the auth gate consumes and clears the launch tap.
const launchResponse =
  Platform.OS === "web" ? null : Notifications.getLastNotificationResponse();

/**
 * Identifier of the tap that started this process, if one did. A later read of
 * the "last response" that doesn't match it was tapped while the app was
 * already running.
 */
export const launchNotificationId =
  launchResponse?.notification.request.identifier ?? null;

// Per JS context: one cold start per process, however many sign-ins it sees.
let coldStartLogged = false;
let backgroundedAt: number | null = null;
let lastNotificationTapAt = 0;
let settleTimer: ReturnType<typeof setTimeout> | null = null;

/** Called for every applied notification tap, so an open can attribute itself. */
export function noteNotificationTap(): void {
  lastNotificationTapAt = Date.now();
}

function logOpenAfterSettle(userId: string, coldStart: boolean): void {
  const activeAt = Date.now();
  settleTimer = setTimeout(() => {
    settleTimer = null;
    logProductEvent(userId, "app_opened", {
      cold_start: coldStart,
      from_notification:
        (coldStart && launchResponse !== null) ||
        lastNotificationTapAt >= activeAt - NOTIFICATION_TAP_SETTLE_MS,
    });
  }, NOTIFICATION_TAP_SETTLE_MS);
}

// Kept outside the hook on purpose: React Compiler rewrites hook bodies, and it
// compiled a copy-then-null of `backgroundedAt` into a read after the null,
// so every resume looked like the app had never left.
function handleAppStateChange(
  state: AppStateStatus,
  userId: string | undefined
): void {
  if (state === "background") {
    backgroundedAt = Date.now();
    return;
  }
  if (state !== "active" || !userId) return;
  if (!coldStartLogged) {
    // A process launched in the background (e.g. by a silent push) is first
    // opened here, possibly by a tap.
    coldStartLogged = true;
    logOpenAfterSettle(userId, true);
    return;
  }
  const awayMs = backgroundedAt === null ? 0 : Date.now() - backgroundedAt;
  backgroundedAt = null;
  if (awayMs >= APP_OPEN_GAP_MS) logOpenAfterSettle(userId, false);
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

  useEffect(() => {
    if (!userId || coldStartLogged) return;
    if (AppState.currentState !== "active") return;
    coldStartLogged = true;
    logProductEvent(userId, "app_opened", {
      cold_start: true,
      from_notification: launchResponse !== null,
    });
  }, [userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      handleAppStateChange(state, userId)
    );
    return () => {
      subscription.remove();
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = null;
    };
  }, [userId]);
}
