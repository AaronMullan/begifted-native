// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno-style ESM import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { internalErrorResponse } from "../_shared/error-response.ts";

// Permanently deletes the caller's account and all data they own (DEV-260).
// We verify the caller's JWT, then delete with the service role using the
// user_id from the verified token -- never from the body -- so a caller can
// only ever delete themselves.
//
// There is no single cascade to lean on: profiles is not FK-linked to
// auth.users, and recipients/contact_requests are ON DELETE NO ACTION (they
// would block a profile delete). So we delete owned rows in FK-safe order,
// then the auth user last. Deleting recipients cascades all recipient-scoped
// data (gift_suggestions, gift_history, gift_feedback, outbound_clicks,
// occasions, prompt_test_runs); deleting the profile cascades user_preferences;
// deleting the auth user cascades app_notifications, user_legal_acceptances,
// and user_push_tokens. Data is removed before the auth user so a mid-way
// failure leaves the account intact and safely retryable.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore - Deno env at runtime
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
// @ts-ignore - Deno env at runtime
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// @ts-ignore - Deno env at runtime
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    const userId = user.id;

    // A preservation hold keeps the account and everything in it. The user
    // sees the ordinary delete failure, not a reason.
    const { data: restriction, error: restrictionError } = await admin
      .from("account_restrictions")
      .select("hold_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (restrictionError) {
      return jsonResponse({ error: "Failed to delete account" }, 500);
    }
    if (restriction?.hold_at) {
      console.warn(
        `[delete-account] refused: preservation hold user=${userId}`
      );
      return jsonResponse({ error: "Failed to delete account" }, 500);
    }

    // Photos sit at public URLs, so they go before the rows that point at
    // them. Both buckets key objects by the owner's user ID.
    for (const bucket of PHOTO_BUCKETS) {
      const removeError = await removeUserFolder(admin, bucket, userId);
      if (removeError) {
        return jsonResponse(
          { error: `Failed to delete ${bucket}: ${removeError}` },
          500
        );
      }
    }

    // FK-safe order. Each delete targets only rows owned by the verified user.
    const ownedDeletes: { table: string; column: string }[] = [
      { table: "contact_requests", column: "user_id" },
      { table: "occasions", column: "user_id" },
      { table: "recipients", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    for (const { table, column } of ownedDeletes) {
      const { error } = await admin.from(table).delete().eq(column, userId);
      if (error) {
        return jsonResponse(
          { error: `Failed to delete ${table}: ${error.message}` },
          500
        );
      }
    }

    const { error: authDeleteError } =
      await admin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      return jsonResponse(
        { error: `Failed to delete account: ${authDeleteError.message}` },
        500
      );
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    return internalErrorResponse("delete-account", err, corsHeaders);
  }
});

const PHOTO_BUCKETS = ["avatars", "recipient-photos"];

// Storage lists at most `limit` entries per call, so page until a short page.
// Returns an error message, or null once the folder is empty.
async function removeUserFolder(
  // deno-lint-ignore no-explicit-any
  admin: any,
  bucket: string,
  userId: string
): Promise<string | null> {
  const pageSize = 100;
  // A remove that reports success but leaves the files would otherwise list
  // the same page forever.
  for (let page = 0; page < 50; page++) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(userId, { limit: pageSize });
    if (error) return error.message;
    // Folder entries have no id and can't be removed by path; uploads are
    // flat under the user's folder, so skipping them leaves nothing behind.
    const files = (data ?? []).filter((f: { id: string | null }) => f.id);
    if (files.length === 0) return null;
    const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
    const { error: removeError } = await admin.storage
      .from(bucket)
      .remove(paths);
    if (removeError) return removeError.message;
    if (data.length < pageSize) return null;
  }
  return "too many files to remove";
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
