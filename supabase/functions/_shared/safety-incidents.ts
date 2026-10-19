// @ts-ignore - Deno-style ESM import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type GateIncident = {
  userId: string;
  categories: string[];
  kind: string;
  action: unknown;
  conversationType: unknown;
  requestId: string;
};

/**
 * Record a moderation-gate hit in safety_incidents. The row ties the hit to the
 * account and never carries what was typed. A failed write must not change
 * what the user sees, so it is logged (without content) and swallowed.
 */
export async function recordGateIncident(
  supabaseUrl: string,
  serviceRoleKey: string,
  incident: GateIncident
): Promise<void> {
  try {
    // The caller awaits this before returning the safety decline, so a slow
    // database must not hold that response hostage.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(3000) }),
      },
    });
    // No .select(): the service role may insert into this table but not read
    // it, so asking for the inserted row back would fail the write.
    const { error } = await admin.from("safety_incidents").insert({
      user_id: incident.userId,
      source: "moderation_gate",
      categories: incident.categories,
      kind: incident.kind,
      action: typeof incident.action === "string" ? incident.action : null,
      conversation_type:
        typeof incident.conversationType === "string"
          ? incident.conversationType
          : null,
      request_id: incident.requestId,
    });
    if (error) throw error;
  } catch (err) {
    console.error(
      `[safety-incident] write failed requestId=${incident.requestId}:`,
      err instanceof Error ? err.message : String(err)
    );
  }
}
