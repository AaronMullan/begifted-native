import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BetaCheckInScreen } from "./api";

/**
 * Once-per-user "seen" flags for the beta UX check-ins (DEV-191). Keyed by user
 * id as well as screen so a device shared across accounts tracks each account
 * independently. Device-local (mirrors lib/intro-storage.ts): sufficient for a
 * beta cohort on a single device, and it must never block the flow -- a storage
 * failure just risks showing a check-in twice, never losing the flow.
 *
 * A flag is set when the check-in is first *presented*, not on submit, so a
 * tester who dismisses without answering still never sees it again.
 */
const key = (userId: string, screen: BetaCheckInScreen) =>
  `@begifted/beta_checkin_seen/${userId}/${screen}`;

export async function hasSeenCheckIn(
  userId: string,
  screen: BetaCheckInScreen
): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(userId, screen))) === "true";
  } catch {
    return false;
  }
}

export async function markCheckInSeen(
  userId: string,
  screen: BetaCheckInScreen
): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId, screen), "true");
  } catch {
    // Silently fail -- worst case the tester sees the check-in again next time.
  }
}
