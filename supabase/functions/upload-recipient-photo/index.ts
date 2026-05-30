// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno-style ESM import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - Deno base64 decoder
import { decode as decodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// Workaround for a project-specific storage RLS misconfiguration where direct
// client uploads to recipient-photos get rejected even with a permissive policy.
// This function uses service_role to perform the upload after verifying the
// caller's JWT, and constrains the object path to the caller's own user_id so
// security is equivalent to the path-scoped RLS policy we would have used.

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

const BUCKET = "recipient-photos";
const MAX_BYTES = 5 * 1024 * 1024; // mirror bucket file_size_limit
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { base64, contentType } = body as {
      base64?: string;
      contentType?: string;
    };

    if (!base64 || typeof base64 !== "string") {
      return jsonResponse({ error: "Missing base64 image data" }, 400);
    }

    const resolvedContentType = (contentType ?? "image/jpeg").toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.has(resolvedContentType)) {
      return jsonResponse(
        { error: `Unsupported contentType: ${resolvedContentType}` },
        400
      );
    }

    let bytes: Uint8Array;
    try {
      bytes = decodeBase64(base64);
    } catch {
      return jsonResponse({ error: "Invalid base64 payload" }, 400);
    }

    if (bytes.byteLength === 0) {
      return jsonResponse({ error: "Empty image payload" }, 400);
    }
    if (bytes.byteLength > MAX_BYTES) {
      return jsonResponse(
        { error: `Image exceeds ${MAX_BYTES} byte limit` },
        413
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const ext =
      resolvedContentType === "image/png"
        ? "png"
        : resolvedContentType === "image/webp"
        ? "webp"
        : "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: resolvedContentType,
        upsert: false,
      });

    if (uploadError) {
      return jsonResponse(
        { error: `Upload failed: ${uploadError.message}` },
        500
      );
    }

    const { data: urlData } = admin.storage
      .from(BUCKET)
      .getPublicUrl(uploadData.path);

    return jsonResponse({
      publicUrl: urlData.publicUrl,
      path: uploadData.path,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
