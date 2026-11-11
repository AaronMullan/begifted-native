import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import type { User } from "@supabase/supabase-js";
import { acceptInvite, acceptInviteByEmail } from "./api/invites";

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

type FlushResult = "credited" | "declined" | "none" | "error";

/**
 * Redeems a waiting invite code for the signed-in account. The code is
 * dropped once the server has answered, whether or not it credited the
 * invite; on a network or server error it stays for the next launch.
 */
export async function flushPendingInvite(): Promise<FlushResult> {
  try {
    const code = await AsyncStorage.getItem(PENDING_KEY);
    if (!code) return "none";
    const credited = await acceptInvite(code);
    await AsyncStorage.removeItem(PENDING_KEY);
    return credited ? "credited" : "declined";
  } catch (err) {
    Sentry.captureException(
      err instanceof Error ? err : new Error(String(err)),
      { tags: { feature: "invites" } }
    );
    return "error";
  }
}

// Mirrors the server's window in accept_invite_by_email, so established
// accounts skip the call entirely.
const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Credits a new account to the invite that brought it in: by the code the
 * link left on this device, or else by the email the friend typed on the
 * invite web page before installing — the path for anyone who installed from
 * TestFlight, which drops the code. A code that failed to send wins over the
 * email next launch, so a network blip can't hand the credit to a different
 * invite.
 */
export async function creditInvite(user: User): Promise<void> {
  const result = await flushPendingInvite();
  if (result === "credited" || result === "error") return;
  if (Date.now() - new Date(user.created_at).getTime() > NEW_ACCOUNT_MS) {
    return;
  }
  try {
    await acceptInviteByEmail();
  } catch (err) {
    Sentry.captureException(
      err instanceof Error ? err : new Error(String(err)),
      { tags: { feature: "invites" } }
    );
  }
}
