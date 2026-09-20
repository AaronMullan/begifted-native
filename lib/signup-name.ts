import * as Sentry from "@sentry/react-native";
import { supabase } from "./supabase";

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
