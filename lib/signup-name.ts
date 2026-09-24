import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const PENDING_KEY = "begifted-pending-signup-name";

type PendingSignUpName = { email: string; name: string };

/**
 * The name typed at signup reaches `profiles.full_name` through auth metadata:
 * `signUp({ options: { data: { full_name } } })` stores it on the auth user and
 * the `on_auth_user_created` trigger copies it into the profile row it inserts.
 * That is the only path that works while email confirmation is pending — there
 * is no session then, so a client write is RLS-filtered to zero rows and still
 * reports success.
 *
 * This is the belt-and-braces half: with a session in hand, read the row back
 * (an unchanged write is indistinguishable from a successful one) and upsert if
 * the name is missing. Upsert, not update, so a missing profile row is created
 * rather than silently skipped. Failures go to Sentry instead of blocking the
 * user, whose account already exists by this point.
 */
export async function confirmSignUpNameSaved(
  userId: string,
  name: string
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data?.full_name === name) return;

    // .select().single() turns an RLS-filtered no-op into an error, which a
    // bare write would not surface.
    const { error: repairError } = await supabase
      .from("profiles")
      .upsert({ id: userId, full_name: name }, { onConflict: "id" })
      .select("full_name")
      .single();
    if (repairError) throw repairError;
  } catch (err) {
    Sentry.captureException(
      err instanceof Error ? err : new Error(String(err)),
      { tags: { feature: "signup-name" } }
    );
  }
}

/**
 * A repeat `signUp()` by a user who never confirmed their email reuses the
 * existing auth user, and GoTrue discards `options.data` on that path — so the
 * name never reaches the server and no trigger can copy it. Carry it on the
 * device instead, and write it once a session exists.
 */
export async function markPendingSignUpName(
  email: string,
  name: string
): Promise<void> {
  try {
    const pending: PendingSignUpName = { email: email.toLowerCase(), name };
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Best-effort: worst case the user sets their name in Settings.
  }
}

/**
 * Fills `profiles.full_name` only when it is still NULL, so a repeat signup
 * never overwrites a name the account already has. Only the account the name
 * was typed for gets it; a marker for another email is left for that account.
 */
export async function flushPendingSignUpName(user: User): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return;
    const pending = JSON.parse(raw) as PendingSignUpName;
    if (pending.email !== user.email?.toLowerCase()) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;

    if (!data?.full_name) {
      // .select().single() turns an RLS-filtered no-op into an error, which a
      // bare write would not surface.
      const { error: writeError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, full_name: pending.name }, { onConflict: "id" })
        .select("full_name")
        .single();
      if (writeError) throw writeError;
    }
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch (err) {
    // Marker stays; retried on the next authenticated load.
    Sentry.captureException(
      err instanceof Error ? err : new Error(String(err)),
      { tags: { feature: "signup-name" } }
    );
  }
}
