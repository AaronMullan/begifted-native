// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno-style ESM import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - Deno-style ESM import
import { decodeJwt, importPKCS8, SignJWT } from "https://esm.sh/jose@5.9.6";
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
//
// Apple requires revoking Sign in with Apple tokens on account deletion.
// Supabase keeps no Apple refresh token for ID-token sign-ins, so the client
// re-authorizes with Apple and sends the fresh authorization code; we exchange
// it for a refresh token and revoke that. Revocation runs before any data is
// deleted, so a failure leaves the account intact rather than deleted with a
// live Apple grant. Off iOS no code can be obtained; deletion must still be
// possible there, so it proceeds unrevoked and is logged.

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
// @ts-ignore - Deno env at runtime
const appleTeamId = Deno.env.get("APPLE_TEAM_ID") ?? "";
// @ts-ignore - Deno env at runtime
const appleKeyId = Deno.env.get("APPLE_KEY_ID") ?? "";
// @ts-ignore - Deno env at runtime
const applePrivateKey = Deno.env.get("APPLE_PRIVATE_KEY") ?? "";
// The native app's tokens are issued to its bundle ID, so the bundle ID is the
// client_id Apple expects on token exchange and revocation.
// @ts-ignore - Deno env at runtime
const appleClientId = Deno.env.get("APPLE_CLIENT_ID") ?? "com.begifted.app";

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

    const appleError = await revokeAppleIfLinked(req, user);
    if (appleError) return appleError;

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

// Resolves an error response to stop deletion, or null to proceed.
async function revokeAppleIfLinked(
  req: Request,
  user: { id: string; identities?: { id: string; provider: string }[] }
): Promise<Response | null> {
  const appleIdentity = (user.identities ?? []).find(
    (identity) => identity.provider === "apple"
  );
  if (!appleIdentity) return null;

  const body = await req.json().catch(() => ({}));
  const code =
    typeof body?.apple_authorization_code === "string"
      ? body.apple_authorization_code
      : "";
  if (!code) {
    console.warn(
      `[delete-account] Apple identity without authorization code; deleting unrevoked (user ${user.id})`
    );
    return null;
  }

  const revoked = await revokeAppleGrant(code, appleIdentity.id);
  return revoked
    ? null
    : jsonResponse({ error: "Apple ID does not match this account" }, 409);
}

async function appleClientSecret(): Promise<string> {
  if (!appleTeamId || !appleKeyId || !applePrivateKey) {
    throw new Error("Apple revocation secrets are not configured");
  }
  // Secrets often store the .p8 with literal "\n" sequences.
  const key = await importPKCS8(applePrivateKey.replace(/\\n/g, "\n"), "ES256");
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: appleKeyId })
    .setIssuer(appleTeamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .setAudience("https://appleid.apple.com")
    .setSubject(appleClientId)
    .sign(key);
}

// Resolves false without revoking when the code belongs to a different Apple
// ID than the account's (e.g. a shared device), which would otherwise revoke
// the wrong grant and leave the account's own grant live.
async function revokeAppleGrant(
  authorizationCode: string,
  expectedSub: string
): Promise<boolean> {
  const clientSecret = await appleClientSecret();

  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appleClientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(
      `Apple token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`
    );
  }
  const tokens = await tokenRes.json();
  // Received directly from Apple over TLS, so decoding without verifying the
  // signature is sufficient to read the subject.
  if (!tokens.id_token || decodeJwt(tokens.id_token).sub !== expectedSub) {
    return false;
  }
  const token: string | undefined = tokens.refresh_token ?? tokens.access_token;
  const tokenTypeHint = tokens.refresh_token ? "refresh_token" : "access_token";
  if (!token) throw new Error("Apple token exchange returned no token");

  // Revoking the refresh token ends the user's whole grant for this app.
  const revokeRes = await fetch("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appleClientId,
      client_secret: clientSecret,
      token,
      token_type_hint: tokenTypeHint,
    }),
  });
  if (!revokeRes.ok) {
    throw new Error(
      `Apple token revocation failed: ${revokeRes.status} ${await revokeRes.text()}`
    );
  }
  return true;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
