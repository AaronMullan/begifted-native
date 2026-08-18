// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno-style ESM import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Forwards user identity and product events to Customer.io's Track API.
// Called by pg_net triggers (see the customerio_sync migration), never by the
// app: deployed with --no-verify-jwt, so the shared secret header is the only
// gate. Requests without it are rejected before anything is read.
//
// Privacy invariant (DEV-373 acceptance criterion): recipient-level data —
// names, addresses, birthdays, interests, AI summaries, household context,
// tone preferences, conversation summaries — must never reach Customer.io.
// Enforcement is structural: identify payloads are built only from
// ATTRIBUTE_SOURCES below, and event properties pass through
// EVENT_PROPERTY_ALLOWLIST. Adding a field to either list is a privacy
// decision, not a plumbing change.

// @ts-ignore - Deno env at runtime
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
// @ts-ignore - Deno env at runtime
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// @ts-ignore - Deno env at runtime
const cioSiteId = Deno.env.get("CUSTOMERIO_SITE_ID") ?? "";
// @ts-ignore - Deno env at runtime
const cioTrackApiKey = Deno.env.get("CUSTOMERIO_TRACK_API_KEY") ?? "";
// @ts-ignore - Deno env at runtime
const syncSecret = Deno.env.get("CUSTOMERIO_SYNC_SECRET") ?? "";

const TRACK_API_BASE = "https://track.customer.io/api/v1";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Event properties the client may log that are safe to forward: opaque ids,
// enums, and counts only.
const EVENT_PROPERTY_ALLOWLIST = new Set([
  "recipient_id",
  "occasion_id",
  "occasion_type",
  "suggestion_count",
  "screen",
  "source",
]);

type ProductEventRecord = {
  id?: string;
  user_id?: string;
  event_name?: string;
  properties?: Record<string, unknown>;
  platform?: string | null;
  created_at?: string;
};

type SyncPayload = {
  source?: "product_events" | "profiles";
  record?: ProductEventRecord & { id?: string };
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toUnixSeconds(value: unknown): number | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
}

function countOrOmit(
  result: { count: number | null; error: { message?: string } | null },
  label: string
): number | undefined {
  if (result.error) {
    console.error(`customerio-sync: ${label} query failed:`, result.error);
    return undefined;
  }
  return result.count ?? 0;
}

function buildEventData(record: ProductEventRecord): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record.properties ?? {})) {
    if (EVENT_PROPERTY_ALLOWLIST.has(key)) data[key] = value;
  }
  if (record.platform) data.platform = record.platform;
  return data;
}

async function trackRequest(
  path: string,
  method: "PUT" | "POST",
  body: Record<string, unknown>
): Promise<Response> {
  return fetch(`${TRACK_API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${cioSiteId}:${cioTrackApiKey}`)}`,
    },
    body: JSON.stringify(body),
  });
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!syncSecret || req.headers.get("x-sync-secret") !== syncSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!cioSiteId || !cioTrackApiKey) {
    console.error("customerio-sync: missing Customer.io credentials");
    return jsonResponse({ error: "Not configured" }, 500);
  }

  try {
    const payload = (await req.json().catch(() => null)) as SyncPayload | null;
    const record = payload?.record;
    const source = payload?.source;
    if (!record || (source !== "product_events" && source !== "profiles")) {
      return jsonResponse({ error: "Invalid payload" }, 400);
    }

    const userId = source === "product_events" ? record.user_id : record.id;
    if (!userId || !UUID_RE.test(userId)) {
      return jsonResponse({ error: "Invalid user id" }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Email lives on auth.users, not profiles. Only a definitive 404 means the
    // account was deleted between the trigger firing and now — any other Auth
    // failure must surface as an error, or transient outages silently drop
    // events (pg_net never retries, so a 200 here is a permanent drop).
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(userId);
    if (userError && userError.status !== 404) {
      console.error("customerio-sync: auth lookup failed:", userError);
      return jsonResponse({ error: "Auth lookup failed" }, 502);
    }
    if (!userData?.user) {
      return jsonResponse({ ok: true, skipped: "user not found" });
    }
    const authUser = userData.user;

    // signed_up fires from an auth.users trigger before the client upserts a
    // profiles row, so a null profile is a normal case, not an error.
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, trial_status, trial_start_date, trial_end_date, account_status, early_activated_at, qualified_trial_user_at, subscription_status, subscription_plan, marketing_email_status, lifecycle_email_status"
      )
      .eq("id", userId)
      .maybeSingle();

    const [peopleCount, occasionsCount, recsViewedCount] = await Promise.all([
      supabase
        .from("recipients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("occasions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("product_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_name", "recommendations_viewed"),
    ]);

    // Customer.io attribute writes are upserts, so what we send for empty
    // values decides staleness behavior:
    // - profile row exists, column NULL → send "" (Customer.io's delete
    //   marker), so a deliberately cleared value propagates instead of the
    //   stale one living in Customer.io forever
    // - no profile row yet (signed_up fires before the client upserts one) →
    //   omit profile fields entirely
    // - count query failed → omit the count so the previous value survives;
    //   coercing errors to 0 would fire "has no people"-style journeys at
    //   active users
    const profileAttr = (value: unknown): unknown =>
      profile ? (value ?? "") : undefined;
    const attributeSources: Record<string, unknown> = {
      email: authUser.email,
      email_verified: Boolean(authUser.email_confirmed_at),
      name: profileAttr(profile?.full_name),
      created_at: toUnixSeconds(authUser.created_at),
      trial_status: profileAttr(profile?.trial_status),
      trial_start_date: profileAttr(toUnixSeconds(profile?.trial_start_date)),
      trial_end_date: profileAttr(toUnixSeconds(profile?.trial_end_date)),
      account_status: profileAttr(profile?.account_status),
      early_activated: profile
        ? Boolean(profile.early_activated_at)
        : undefined,
      qualified_trial_user: profile
        ? Boolean(profile.qualified_trial_user_at)
        : undefined,
      subscription_status: profileAttr(profile?.subscription_status),
      subscription_plan: profileAttr(profile?.subscription_plan),
      marketing_email_status: profileAttr(profile?.marketing_email_status),
      lifecycle_email_status: profileAttr(profile?.lifecycle_email_status),
      people_count: countOrOmit(peopleCount, "people_count"),
      occasions_count: countOrOmit(occasionsCount, "occasions_count"),
      recommendations_viewed_count: countOrOmit(
        recsViewedCount,
        "recommendations_viewed_count"
      ),
    };
    const attributes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(attributeSources)) {
      if (value !== undefined && value !== null) attributes[key] = value;
    }

    const identifyRes = await trackRequest(
      `/customers/${userId}`,
      "PUT",
      attributes
    );
    if (!identifyRes.ok) {
      console.error(
        `customerio-sync: identify failed (${identifyRes.status}):`,
        await identifyRes.text()
      );
      return jsonResponse({ error: "Identify failed" }, 502);
    }

    if (source === "product_events" && record.event_name) {
      const eventRes = await trackRequest(
        `/customers/${userId}/events`,
        "POST",
        {
          name: record.event_name,
          timestamp: toUnixSeconds(record.created_at),
          data: buildEventData(record),
        }
      );
      if (!eventRes.ok) {
        console.error(
          `customerio-sync: event failed (${eventRes.status}):`,
          await eventRes.text()
        );
        return jsonResponse({ error: "Event failed" }, 502);
      }
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("customerio-sync error:", error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
