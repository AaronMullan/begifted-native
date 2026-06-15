// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno-style ESM import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Records a user's acceptance of specific Terms + Privacy versions with a
// trustworthy paper trail (DEV-142). The client supplies only the version IDs
// and device metadata; accepted_at and ip_address are stamped server-side
// (accepted_at via a DB trigger, ip_address from the request here) so neither
// can be forged in the payload. We verify the caller's JWT, then insert with
// the service role using the user_id from the verified token -- never from the
// body.

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

// Optional device metadata the client may supply. Anything not in this set is
// ignored so a client can't write arbitrary columns.
type AcceptanceBody = {
  terms_version_id?: string;
  privacy_policy_version_id?: string;
  acceptance_method?: string;
  app_version?: string;
  platform?: string;
  os_version?: string;
  device_model?: string;
  locale?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    const body = (await req.json().catch(() => null)) as AcceptanceBody | null;
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const termsVersionId = body.terms_version_id;
    const privacyVersionId = body.privacy_policy_version_id;
    if (!termsVersionId || !UUID_RE.test(termsVersionId)) {
      return jsonResponse(
        { error: "terms_version_id must be a valid version id" },
        400
      );
    }
    if (!privacyVersionId || !UUID_RE.test(privacyVersionId)) {
      return jsonResponse(
        { error: "privacy_policy_version_id must be a valid version id" },
        400
      );
    }

    // First entry in x-forwarded-for is the originating client; the rest are
    // proxy hops. Fall back to x-real-ip. Stored as-is (inet column validates).
    const ipAddress = clientIp(req);

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Guard against accepting a non-existent version id (FKs would also catch
    // this, but a 400 is friendlier than a 500 on a bad client payload).
    const { data: versions, error: versionError } = await admin
      .from("legal_document_versions")
      .select("id")
      .in("id", [termsVersionId, privacyVersionId]);
    if (versionError) {
      return jsonResponse(
        { error: `Version lookup failed: ${versionError.message}` },
        500
      );
    }
    const foundIds = new Set((versions ?? []).map((v: { id: string }) => v.id));
    if (!foundIds.has(termsVersionId) || !foundIds.has(privacyVersionId)) {
      return jsonResponse({ error: "Unknown legal document version" }, 400);
    }

    // accepted_at is intentionally omitted: the BEFORE INSERT trigger stamps it
    // server-side. user_id comes from the verified JWT, never the body.
    const { data: inserted, error: insertError } = await admin
      .from("user_legal_acceptances")
      .insert({
        user_id: user.id,
        terms_version_id: termsVersionId,
        privacy_policy_version_id: privacyVersionId,
        acceptance_method: str(body.acceptance_method) ?? "signup_checkbox",
        app_version: str(body.app_version),
        platform: str(body.platform),
        os_version: str(body.os_version),
        device_model: str(body.device_model),
        locale: str(body.locale),
        ip_address: ipAddress,
      })
      .select("id, accepted_at")
      .single();

    if (insertError) {
      return jsonResponse(
        { error: `Failed to record acceptance: ${insertError.message}` },
        500
      );
    }

    return jsonResponse(
      { id: inserted.id, accepted_at: inserted.accepted_at },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  return realIp?.trim() || null;
}

// Normalize optional string fields: trim, and treat empty as absent.
function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
