// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno-style ESM import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/require-user.ts";
import { internalErrorResponse } from "../_shared/error-response.ts";

// Feedback dashboard proxy. Jira and Sentry are only reachable server-side
// (their tokens must never ship in the client), so the admin screen calls this
// function, which returns a single feedback-centric feed: each Sentry
// user-feedback item, with the Jira ticket it spawned (if any) resolved to its
// live status. Three sources are joined:
//   1. The Sentry user-feedback inbox (the feed, incl. not-yet-triaged items).
//   2. The feedback_tickets mapping table (which feedback item became which ticket).
//   3. Jira tickets labeled user-feedback (only to resolve the live status of a
//      linked ticket — no standalone ticket list is returned).
// Unlike refine-prompt (auth only), this verifies is_admin before returning —
// it exposes internal Jira/Sentry data.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore - Deno env at runtime
const env = (k: string, fallback = "") => Deno.env.get(k) ?? fallback;

const supabaseUrl = env("SUPABASE_URL");
const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");

const jiraBase = env("JIRA_BASE_URL", "https://be-gifted.atlassian.net");
const jiraEmail = env("JIRA_EMAIL");
const jiraToken = env("JIRA_API_TOKEN");

const sentryToken = env("SENTRY_API_TOKEN");
const sentryOrg = env("SENTRY_ORG", "begifted");
const sentryProject = env("SENTRY_FEEDBACK_PROJECT", "4511361418395648");

// Jira workflow buckets keyed by statusCategory.key (stable across custom
// workflows, unlike status names).
type StatusCategory = "todo" | "in_progress" | "done" | "unknown";
function mapStatusCategory(key: string | undefined): StatusCategory {
  switch (key) {
    case "new":
      return "todo";
    case "indeterminate":
      return "in_progress";
    case "done":
      return "done";
    default:
      return "unknown";
  }
}

function labelSource(
  labels: string[]
): "user-feedback" | "team-feedback" | "other" {
  if (labels.includes("user-feedback")) return "user-feedback";
  if (labels.includes("team-feedback")) return "team-feedback";
  return "other";
}

type FeedbackTicket = {
  key: string;
  summary: string;
  statusName: string;
  statusCategory: StatusCategory;
  priority: string | null;
  assignee: string | null;
  source: "user-feedback" | "team-feedback" | "other";
  url: string;
  updated: string;
};

type RawFeedbackItem = {
  id: string;
  message: string;
  reporter: string | null;
  createdAt: string;
  resolved: boolean;
  jiraKey: string | null;
  jiraUrl: string | null;
  statusName: string | null;
  statusCategory: StatusCategory | null;
};

// The enhanced /search/jql endpoint hard-caps maxResults at 100 and paginates
// with an opaque nextPageToken (there is no total). Walk the pages so an old
// feedback ticket past the first 100 doesn't silently vanish from the list and
// from the raw-feed linkage map. Bounded so a token bug can't loop forever.
const JIRA_MAX_PAGES = 10;

async function fetchJiraTickets(): Promise<FeedbackTicket[]> {
  if (!jiraEmail || !jiraToken) {
    throw new Error("Jira credentials are not configured");
  }
  const auth = btoa(`${jiraEmail}:${jiraToken}`);
  const tickets: FeedbackTicket[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < JIRA_MAX_PAGES; page++) {
    const params = new URLSearchParams({
      jql: "project = DEV AND labels = user-feedback ORDER BY updated DESC",
      fields: "summary,status,priority,assignee,labels,updated",
      maxResults: "100",
    });
    if (nextPageToken) params.set("nextPageToken", nextPageToken);

    const res = await fetch(`${jiraBase}/rest/api/2/search/jql?${params}`, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Jira search failed (${res.status}): ${detail.slice(0, 300)}`
      );
    }
    const data = await res.json();
    for (const issue of (data?.issues ?? []) as any[]) {
      const f = issue.fields ?? {};
      tickets.push({
        key: issue.key,
        summary: f.summary ?? "(no summary)",
        statusName: f.status?.name ?? "Unknown",
        statusCategory: mapStatusCategory(f.status?.statusCategory?.key),
        priority: f.priority?.name ?? null,
        assignee: f.assignee?.displayName ?? null,
        source: labelSource(f.labels ?? []),
        url: `${jiraBase}/browse/${issue.key}`,
        updated: f.updated ?? "",
      });
    }
    if (data?.isLast || !data?.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }
  return tickets;
}

// The issues list gives a paraphrased title; the concrete message and the
// reporter live on the feedback event. Fetch the latest event per item (bounded
// + parallel), falling back to the issue title if the event or field is absent.
const RAW_FEED_LIMIT = 40;

async function fetchSentryFeedback(): Promise<
  {
    id: string;
    shortId: string;
    message: string;
    reporter: string | null;
    createdAt: string;
    resolved: boolean;
  }[]
> {
  if (!sentryToken) throw new Error("Sentry token is not configured");
  const headers = { Authorization: `Bearer ${sentryToken}` };

  const listUrl =
    `https://sentry.io/api/0/organizations/${sentryOrg}/issues/` +
    `?project=${sentryProject}&query=${encodeURIComponent("issue.category:feedback")}` +
    `&sort=date&statsPeriod=90d&limit=50`;
  const listRes = await fetch(listUrl, { headers });
  if (!listRes.ok) {
    const detail = await listRes.text().catch(() => "");
    throw new Error(
      `Sentry feedback list failed (${listRes.status}): ${detail.slice(0, 300)}`
    );
  }
  const allIssues: any[] = (await listRes.json()) ?? [];
  // Junk the triage skill marked `ignored` shouldn't reappear in the feed; only
  // unresolved (not yet triaged) and resolved (triaged → has a ticket) belong.
  const issues = allIssues.filter((i) => i.status !== "ignored");

  const items = await Promise.all(
    issues.slice(0, RAW_FEED_LIMIT).map(async (issue) => {
      const id = String(issue.id);
      const shortId: string = issue.shortId ?? "";
      const resolved = issue.status === "resolved";
      const createdAt = issue.firstSeen ?? issue.lastSeen ?? "";
      let message: string = issue.metadata?.value ?? issue.title ?? "";
      let reporter: string | null = issue.metadata?.contact_email ?? null;

      try {
        const evRes = await fetch(
          `https://sentry.io/api/0/organizations/${sentryOrg}/issues/${id}/events/latest/?full=true`,
          { headers }
        );
        if (evRes.ok) {
          const ev = await evRes.json();
          const fb = ev?.contexts?.feedback ?? {};
          if (typeof fb.message === "string" && fb.message.trim()) {
            message = fb.message;
          }
          reporter = fb.contact_email ?? fb.name ?? ev?.user?.email ?? reporter;
        }
      } catch {
        // Keep the issue-level fallback; a single event fetch failing must not
        // sink the whole dashboard.
      }

      return { id, shortId, message, reporter, createdAt, resolved };
    })
  );
  return items;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { user, errorResponse } = await requireUser(req, corsHeaders);
    if (errorResponse) return errorResponse;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (profile?.is_admin !== true) {
      return json({ error: "Forbidden" }, 403);
    }

    // Fetch the three sources independently: one being down (e.g. a missing
    // token, or a transient Jira/Sentry 5xx) must degrade to a partial
    // dashboard, not a total failure. Per-source errors are surfaced to the
    // client as generic notices — never the raw upstream body, which can carry
    // internal detail — while the real reason is logged server-side.
    const [jiraR, sentryR, mappingR] = await Promise.allSettled([
      fetchJiraTickets(),
      fetchSentryFeedback(),
      admin
        .from("feedback_tickets")
        .select("source_ref, jira_key")
        .eq("source", "sentry"),
    ]);

    const tickets = jiraR.status === "fulfilled" ? jiraR.value : [];
    const sentryFeedback = sentryR.status === "fulfilled" ? sentryR.value : [];
    const mappingRows =
      mappingR.status === "fulfilled" ? (mappingR.value.data ?? []) : [];

    if (jiraR.status === "rejected") {
      console.error("[admin-feedback-tickets] jira", jiraR.reason);
    }
    if (sentryR.status === "rejected") {
      console.error("[admin-feedback-tickets] sentry", sentryR.reason);
    }

    const ticketByKey = new Map(tickets.map((t) => [t.key, t]));
    const keyByRef = new Map<string, string>(
      (mappingRows as any[]).map((r) => [r.source_ref, r.jira_key])
    );

    const rawFeedback: RawFeedbackItem[] = sentryFeedback.map((fb) => {
      const jiraKey = keyByRef.get(fb.shortId) ?? null;
      const linked = jiraKey ? ticketByKey.get(jiraKey) : undefined;
      return {
        id: fb.id,
        message: fb.message,
        reporter: fb.reporter,
        createdAt: fb.createdAt,
        resolved: fb.resolved,
        jiraKey,
        jiraUrl: linked?.url ?? null,
        statusName: linked?.statusName ?? null,
        statusCategory: linked?.statusCategory ?? null,
      };
    });

    return json(
      {
        rawFeedback,
        errors: {
          jira:
            jiraR.status === "rejected"
              ? "Couldn't load Jira tickets right now."
              : null,
          sentry:
            sentryR.status === "rejected"
              ? "Couldn't load the Sentry feedback feed right now."
              : null,
        },
      },
      200
    );
  } catch (err) {
    return internalErrorResponse("admin-feedback-tickets", err, corsHeaders);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
