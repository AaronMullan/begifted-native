import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import { acceptInvite } from "./api/invites";

const PENDING_KEY = "begifted-pending-invite-code";

/**
 * An invite link usually opens the app before the friend has an account, and
 * the signup that follows may be email, Google or Apple — only the last two
 * give a session straight away, and none of them can carry the code through
 * auth metadata reliably. So the code waits on the device and is redeemed
 * once any session exists.
 */
export async function setPendingInviteCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, code);
  } catch {
    // Best-effort: the signup still works, the invite just isn't credited.
  }
}

/**
 * Redeems a waiting invite code for the signed-in account. The code is
 * dropped once the server has answered, whether or not it credited the
 * invite; on a network or server error it stays for the next launch.
 */
export async function flushPendingInvite(): Promise<void> {
  try {
    const code = await AsyncStorage.getItem(PENDING_KEY);
    if (!code) return;
    await acceptInvite(code);
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch (err) {
    Sentry.captureException(
      err instanceof Error ? err : new Error(String(err)),
      { tags: { feature: "invites" } }
    );
  }
}
