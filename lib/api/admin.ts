/**
 * Admin API — prompt playground, app config, searches viewer.
 */

import { supabase } from "../supabase";
import { invokeWithRetry } from "../edge-retry";
import type { Recipient } from "../../types/recipient";
import type { BetaCheckInScreen } from "./beta-feedback";

export interface PromptTestRun {
  id: string;
  user_id: string;
  recipient_id: string | null;
  custom_system_prompt: string;
  original_system_prompt: string;
  chat_messages: { role: string; content: string }[];
  generation_result: Record<string, unknown> | null;
  prompt_key: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  created_at: string;
}

export interface SystemPromptVersion {
  id: string;
  prompt_key: string;
  version: number;
  prompt_text: string;
  change_notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

/**
 * Check if a user is an admin
 */
export async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (error) return false;
  return data?.is_admin === true;
}

export interface AdminProfileListItem {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string;
}

/**
 * Fetch all profiles with account email (admin-only, for giver selection).
 * Goes through the admin_list_profiles RPC because email lives in auth.users,
 * not on public.profiles.
 */
export async function fetchAllProfiles(): Promise<AdminProfileListItem[]> {
  const { data, error } = await supabase.rpc("admin_list_profiles");

  if (error) throw error;
  return data || [];
}

/**
 * Fetch recipients belonging to a specific user (admin views another user's recipients)
 */
export async function fetchRecipientsForUser(
  userId: string
): Promise<Recipient[]> {
  const { data, error } = await supabase
    .from("recipients")
    .select(
      "id, name, relationship_type, interests, birthday, emotional_tone_preference, gift_budget_min, gift_budget_max, address, address_line_2, city, state, zip_code, country, photo_url, synthesized_profile, known_roles, household_context, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch prompt test runs for a user
 */
export async function fetchPromptTestRuns(
  _userId: string,
  promptKey?: string
): Promise<PromptTestRun[]> {
  let query = supabase
    .from("prompt_test_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (promptKey) {
    query = query.eq("prompt_key", promptKey);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Create a prompt test run
 */
export async function createPromptTestRun(
  run: Omit<PromptTestRun, "id" | "created_at">
): Promise<PromptTestRun> {
  const { data, error } = await supabase
    .from("prompt_test_runs")
    .insert(run)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch the active system prompt for a given key
 */
export async function fetchActiveSystemPrompt(
  promptKey: string
): Promise<SystemPromptVersion | null> {
  const { data, error } = await supabase
    .from("system_prompt_versions")
    .select("*")
    .eq("prompt_key", promptKey)
    .eq("is_active", true)
    .single();

  if (error) return null;
  return data;
}

/**
 * Fetch all prompt versions for a given key
 */
export async function fetchPromptVersionHistory(
  promptKey: string
): Promise<SystemPromptVersion[]> {
  const { data, error } = await supabase
    .from("system_prompt_versions")
    .select("*")
    .eq("prompt_key", promptKey)
    .order("version", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Deploy a new prompt version (sets it as active, deactivates previous)
 */
export async function deployNewPromptVersion(
  promptKey: string,
  promptText: string,
  changeNotes: string,
  userId: string
): Promise<SystemPromptVersion> {
  // Get the current max version
  const { data: latestVersion } = await supabase
    .from("system_prompt_versions")
    .select("version")
    .eq("prompt_key", promptKey)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const newVersion = (latestVersion?.version || 0) + 1;

  // Deactivate current active version
  await supabase
    .from("system_prompt_versions")
    .update({ is_active: false })
    .eq("prompt_key", promptKey)
    .eq("is_active", true);

  // Insert new active version
  const { data, error } = await supabase
    .from("system_prompt_versions")
    .insert({
      prompt_key: promptKey,
      version: newVersion,
      prompt_text: promptText,
      change_notes: changeNotes,
      is_active: true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── App Config (Kill Switch) ───────────────────────────────────────────────

export interface WhatsNewSection {
  title: string;
  body: string;
}

export interface WhatsNewContent {
  /** ISO date (YYYY-MM-DD) shown as the card's date chip. */
  date?: string;
  sections: WhatsNewSection[];
}

export interface AppConfig {
  id: number;
  recommendations_enabled: boolean;
  notifications_enabled: boolean;
  signups_enabled: boolean;
  ai_provider: "openai" | "anthropic" | "google";
  ai_model: string;
  whats_new: WhatsNewContent | null;
  updated_at: string;
  updated_by: string | null;
}

export async function fetchAppConfig(): Promise<AppConfig> {
  const { data, error } = await supabase
    .from("app_config")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data;
}

export async function updateAppConfig(
  flags: Partial<
    Pick<
      AppConfig,
      | "recommendations_enabled"
      | "notifications_enabled"
      | "signups_enabled"
      | "ai_provider"
      | "ai_model"
    >
  >,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("app_config")
    .update({
      ...flags,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", 1);
  if (error) throw error;
}

// Admin — Searches viewer

export interface RunPick {
  id: string;
  title: string;
  price: number | null;
  link: string | null;
}

export interface RunSummary {
  run_id: string;
  created_at: string;
  ai_provider: string | null;
  ai_model: string | null;
  protocol_prompt_id: string | null;
  protocol_version: number | null;
  wrapper_template_hash: string | null;
  search_queries: string[];
  cited_urls: string[];
  cited_domains: string[];
  recipient: { id: string; name: string } | null;
  giver: { id: string; name: string | null } | null;
  occasion: {
    id: string;
    occasion_type: string | null;
    date: string | null;
  } | null;
  budget: { min: number | null; max: number | null } | null;
  picks: RunPick[];
}

export interface RecentRunsPage {
  runs: RunSummary[];
  total: number;
}

/**
 * Fetch a paginated page of gift generation runs (admin only).
 * Pulls all distinct run_ids ordered by most recent suggestion to
 * compute total + slice, then fetches full data for the page.
 * Acceptable up to ~100K runs; revisit with a postgres function if it grows.
 */
export async function fetchRecentRuns(
  limit: number,
  offset: number
): Promise<RecentRunsPage> {
  const { data: idRows, error: idErr } = await supabase
    .from("gift_suggestions")
    .select("run_id, created_at")
    .not("run_id", "is", null)
    .order("created_at", { ascending: false });

  if (idErr) throw idErr;

  const seen = new Set<string>();
  const orderedRunIds: string[] = [];
  for (const row of idRows ?? []) {
    if (!row.run_id || seen.has(row.run_id)) continue;
    seen.add(row.run_id);
    orderedRunIds.push(row.run_id);
  }

  const total = orderedRunIds.length;
  const pageRunIds = orderedRunIds.slice(offset, offset + limit);
  if (pageRunIds.length === 0) return { runs: [], total };

  const { data: rows, error } = await supabase
    .from("gift_suggestions")
    .select(
      `id, run_id, created_at, title, price, link,
       ai_provider, ai_model, protocol_prompt_id, wrapper_template_hash,
       search_queries, cited_urls, cited_domains,
       recipient_id, occasion_id,
       recipients ( id, name, user_id, gift_budget_min, gift_budget_max ),
       occasions ( id, occasion_type, date )`
    )
    .in("run_id", pageRunIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const promptIds = Array.from(
    new Set(
      (rows ?? [])
        .map((r) => r.protocol_prompt_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
  );

  const promptVersionById = new Map<string, number>();
  if (promptIds.length > 0) {
    const { data: promptRows } = await supabase
      .from("system_prompt_versions")
      .select("id, version")
      .in("id", promptIds);
    for (const p of promptRows ?? []) {
      promptVersionById.set(p.id as string, p.version as number);
    }
  }

  // Batch-fetch giver profiles for the page
  type RecipientEmbed = {
    id: string;
    name: string;
    user_id: string | null;
    gift_budget_min: number | null;
    gift_budget_max: number | null;
  };
  type OccasionEmbed = {
    id: string;
    occasion_type: string | null;
    date: string | null;
  };

  const giverIds = Array.from(
    new Set(
      (rows ?? [])
        .map((r) => {
          const raw = (r.recipients ?? null) as unknown;
          const rec: RecipientEmbed | null = Array.isArray(raw)
            ? ((raw[0] as RecipientEmbed | undefined) ?? null)
            : (raw as RecipientEmbed | null);
          return rec?.user_id ?? null;
        })
        .filter((id): id is string => Boolean(id))
    )
  );

  const giverNameById = new Map<string, string | null>();
  if (giverIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", giverIds);
    for (const p of profileRows ?? []) {
      giverNameById.set(p.id as string, (p.full_name as string | null) ?? null);
    }
  }

  const runMap = new Map<string, RunSummary>();
  for (const r of rows ?? []) {
    if (!r.run_id) continue;
    const rawRecipients = (r.recipients ?? null) as unknown;
    const rawOccasions = (r.occasions ?? null) as unknown;
    const recipient: RecipientEmbed | null = Array.isArray(rawRecipients)
      ? ((rawRecipients[0] as RecipientEmbed | undefined) ?? null)
      : (rawRecipients as RecipientEmbed | null);
    const occasion: OccasionEmbed | null = Array.isArray(rawOccasions)
      ? ((rawOccasions[0] as OccasionEmbed | undefined) ?? null)
      : (rawOccasions as OccasionEmbed | null);

    let summary = runMap.get(r.run_id);
    if (!summary) {
      summary = {
        run_id: r.run_id,
        created_at: r.created_at,
        ai_provider: r.ai_provider,
        ai_model: r.ai_model,
        protocol_prompt_id: r.protocol_prompt_id,
        protocol_version:
          r.protocol_prompt_id != null
            ? (promptVersionById.get(r.protocol_prompt_id) ?? null)
            : null,
        wrapper_template_hash: r.wrapper_template_hash,
        search_queries: (r.search_queries ?? []) as string[],
        cited_urls: (r.cited_urls ?? []) as string[],
        cited_domains: (r.cited_domains ?? []) as string[],
        recipient: recipient
          ? { id: recipient.id, name: recipient.name }
          : null,
        giver: recipient?.user_id
          ? {
              id: recipient.user_id,
              name: giverNameById.get(recipient.user_id) ?? null,
            }
          : null,
        occasion: occasion
          ? {
              id: occasion.id,
              occasion_type: occasion.occasion_type,
              date: occasion.date,
            }
          : null,
        budget: recipient
          ? { min: recipient.gift_budget_min, max: recipient.gift_budget_max }
          : null,
        picks: [],
      };
      runMap.set(r.run_id, summary);
    }
    summary.picks.push({
      id: r.id,
      title: r.title,
      price: r.price,
      link: r.link,
    });
  }

  const runs = pageRunIds
    .map((id) => runMap.get(id))
    .filter((s): s is RunSummary => Boolean(s));

  return { runs, total };
}

export interface BetaFeedbackRow {
  id: string;
  user_id: string;
  giver_name: string | null;
  screen: BetaCheckInScreen;
  // Answers keyed by question id; single-select values are strings, multi-select
  // are arrays. The label map for both lives in beta-check-in-configs.ts.
  responses: Record<string, string | string[]>;
  free_text: string | null;
  created_at: string;
}

/**
 * Beta UX check-in responses for the admin viewer (DEV-415). Reads the whole
 * append-only table (a few dozen rows across the closed beta) and joins
 * user_id -> profiles for a readable name, the same batch-join fetchRecentRuns
 * uses for givers. Ordered newest-first.
 */
export async function fetchBetaFeedback(): Promise<BetaFeedbackRow[]> {
  const { data: rows, error } = await supabase
    .from("beta_feedback")
    .select("id, user_id, screen, responses, free_text, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
  const nameById = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const p of profileRows ?? []) {
      nameById.set(p.id as string, (p.full_name as string | null) ?? null);
    }
  }

  return (rows ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    giver_name: nameById.get(r.user_id) ?? null,
    screen: r.screen as BetaCheckInScreen,
    responses: (r.responses ?? {}) as Record<string, string | string[]>,
    free_text: r.free_text,
    created_at: r.created_at,
  }));
}

/**
 * Fetch a single prompt version by id (admin viewer modal)
 */
export async function fetchSystemPromptById(
  id: string
): Promise<SystemPromptVersion | null> {
  const { data, error } = await supabase
    .from("system_prompt_versions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface WrapperTemplate {
  hash: string;
  template_text: string;
  first_seen_at: string;
}

/**
 * Fetch a wrapper template by its content hash (admin viewer modal)
 */
export async function fetchWrapperTemplate(
  hash: string
): Promise<WrapperTemplate | null> {
  const { data, error } = await supabase
    .from("wrapper_templates")
    .select("*")
    .eq("hash", hash)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface RecipientProfileSnapshot {
  id: string;
  name: string;
  synthesized_profile: string | null;
}

/**
 * Fetch a recipient's synthesized profile (admin viewer modal)
 */
export async function fetchRecipientSynthesizedProfile(
  id: string
): Promise<RecipientProfileSnapshot | null> {
  const { data, error } = await supabase
    .from("recipients")
    .select("id, name, synthesized_profile")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as RecipientProfileSnapshot | null;
}

export interface GiverProfileSnapshot {
  user_id: string;
  full_name: string | null;
  synthesized_giver_profile: string | null;
}

/**
 * Fetch a giver's synthesized profile (admin viewer modal)
 */
export async function fetchGiverSynthesizedProfile(
  userId: string
): Promise<GiverProfileSnapshot | null> {
  const [
    { data: profile, error: profileErr },
    { data: prefs, error: prefsErr },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select("synthesized_giver_profile")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (profileErr) throw profileErr;
  if (prefsErr) throw prefsErr;
  return {
    user_id: userId,
    full_name: (profile?.full_name as string | null) ?? null,
    synthesized_giver_profile:
      (prefs?.synthesized_giver_profile as string | null) ?? null,
  };
}

/**
 * Rollback to a specific prompt version
 */
export async function rollbackToVersion(
  versionId: string,
  promptKey: string
): Promise<void> {
  // Deactivate current active version
  await supabase
    .from("system_prompt_versions")
    .update({ is_active: false })
    .eq("prompt_key", promptKey)
    .eq("is_active", true);

  // Activate the target version
  const { error } = await supabase
    .from("system_prompt_versions")
    .update({ is_active: true })
    .eq("id", versionId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Traction dashboard (DEV-393)

export interface WeeklyCount {
  /** ISO date (YYYY-MM-DD) of the bucket's first day. */
  weekStart: string;
  count: number;
}

export interface WeeklyRunCounts {
  weekStart: string;
  ok: number;
  /** Runs that ended no_results or error. */
  shortfall: number;
}

export interface TractionMetrics {
  totalUsers: number;
  newUsers7d: number;
  activeUsers7d: number;
  /** Percent (0–100) of users with at least one recipient. */
  activationPct: number;
  giftsChosenTotal: number;
  giftsChosen7d: number;
  signupsByWeek: WeeklyCount[];
  clicksByWeek: WeeklyCount[];
  runsByWeek: WeeklyRunCounts[];
  feedbackActions: { action: string; count: number }[];
  upcomingOccasions30d: number;
  trialStatusCounts: { status: string; count: number }[];
  subscriptionStatusCounts: { status: string; count: number }[];
  runs7d: { total: number; ok: number; errors: number; timeouts: number };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TREND_WEEKS = 8;

// PostgREST clamps every response to the project's max-rows (1000 here), so a
// larger .limit() silently truncates. Page with .range() on a unique ordering
// instead; the page cap is a runaway guard, warned about, never silent.
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

async function fetchAll<T>(
  page: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
  console.warn(
    `[traction] row fetch hit the ${MAX_PAGES * PAGE_SIZE}-row guard; metrics undercount — move this query to an RPC`
  );
  return rows;
}

/** Local calendar date (YYYY-MM-DD) — UTC slicing shifts evening viewers a day. */
function localDateString(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Rolling 7-day buckets ending now; index 0 is the oldest week. */
function bucketWeekly(timestamps: string[], now: number): WeeklyCount[] {
  const horizon = now - TREND_WEEKS * WEEK_MS;
  const counts = new Array<number>(TREND_WEEKS).fill(0);
  for (const ts of timestamps) {
    const t = new Date(ts).getTime();
    if (Number.isNaN(t) || t < horizon || t > now) continue;
    const idx = Math.min(TREND_WEEKS - 1, Math.floor((t - horizon) / WEEK_MS));
    counts[idx] += 1;
  }
  return counts.map((count, i) => ({
    weekStart: localDateString(horizon + i * WEEK_MS),
    count,
  }));
}

/**
 * Next occurrence of an occasion as a local-midnight timestamp. Annual
 * occasions (birthdays, anniversaries) are often stored with a past date —
 * see fetchAllOccasions — so they roll forward to this year's or next year's
 * month/day; one-off occasions keep their stored date.
 */
function nextOccurrenceMs(
  dateIso: string | null,
  isAnnual: boolean,
  todayMs: number
): number {
  // Date-unknown occasions store date: null (see lib/api/occasions.ts); the
  // untyped client would pass it straight into split() and crash the fetch.
  if (typeof dateIso !== "string") return NaN;
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return NaN;
  if (!isAnnual) return new Date(y, m - 1, d).getTime();
  const thisYear = new Date(
    new Date(todayMs).getFullYear(),
    m - 1,
    d
  ).getTime();
  return thisYear >= todayMs
    ? thisYear
    : new Date(new Date(todayMs).getFullYear() + 1, m - 1, d).getTime();
}

function tally(values: (string | null | undefined)[]): {
  [key: string]: number;
} {
  const out: { [key: string]: number } = {};
  for (const v of values) {
    if (!v) continue;
    out[v] = (out[v] ?? 0) + 1;
  }
  return out;
}

/**
 * All Traction dashboard numbers in one parallel fetch (admin only).
 * Row fetches page through PostgREST's max-rows clamp and aggregate
 * client-side — the same trade fetchRecentRuns makes. Team accounts
 * (profiles.is_admin) are excluded from every user-behavior metric so
 * admin poking doesn't read as traction.
 */
export async function fetchTractionMetrics(): Promise<TractionMetrics> {
  const now = Date.now();
  const cutoff7d = new Date(now - WEEK_MS).toISOString();
  const cutoff8w = new Date(now - TREND_WEEKS * WEEK_MS).toISOString();

  const [
    profiles,
    allRecipients,
    signupRows,
    events7d,
    allClicks,
    allFeedback,
    runs,
    occasions,
  ] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("profiles")
        .select("id, is_admin, trial_status, subscription_status")
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("recipients")
        .select("id, user_id")
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("product_events")
        .select("user_id, created_at")
        .eq("event_name", "signed_up")
        .gte("created_at", cutoff8w)
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("product_events")
        .select("user_id")
        .gte("created_at", cutoff7d)
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("outbound_clicks")
        .select("user_id, created_at")
        .gte("created_at", cutoff8w)
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("gift_feedback")
        .select("user_id, gift_suggestion_id, action, created_at")
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("gift_generation_runs")
        .select("created_at, status, timeout_hit")
        .gte("created_at", cutoff8w)
        .order("run_id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("occasions")
        .select("recipient_id, date, is_annual")
        .order("id")
        .range(from, to)
    ),
  ]);

  const adminIds = new Set(profiles.filter((p) => p.is_admin).map((p) => p.id));
  const users = profiles.filter((p) => !p.is_admin);
  const totalUsers = users.length;

  const recipients = allRecipients.filter((r) => !adminIds.has(r.user_id));
  const usersWithRecipient = new Set(recipients.map((r) => r.user_id)).size;

  const signups = signupRows.filter((e) => !adminIds.has(e.user_id));
  const newUsers7d = signups.filter((e) => e.created_at >= cutoff7d).length;

  const clicks = allClicks.filter((c) => !adminIds.has(c.user_id));
  const feedback = allFeedback.filter((f) => !adminIds.has(f.user_id));

  // Active User = any engagement row in the trailing 7 days (see CONTEXT.md).
  // Free-text note rows count here (activity), but not as decisions below.
  const activeIds = new Set<string>();
  for (const e of events7d) activeIds.add(e.user_id);
  for (const c of clicks) {
    if (c.created_at >= cutoff7d) activeIds.add(c.user_id);
  }
  for (const f of feedback) {
    if (f.created_at >= cutoff7d) activeIds.add(f.user_id);
  }
  for (const id of adminIds) activeIds.delete(id);

  // gift_feedback is append-only (see GIFT_REMOVAL_ACTIONS in gifts.ts):
  // consumers must read the latest row per gift. "gift_feedback" rows are
  // free-text notes, not decisions, so they neither count nor override one.
  const latestDecision = new Map<
    string,
    { action: string; created_at: string }
  >();
  for (const f of feedback) {
    if (f.action === "gift_feedback" || !f.gift_suggestion_id) continue;
    const prev = latestDecision.get(f.gift_suggestion_id);
    if (!prev || f.created_at >= prev.created_at) {
      latestDecision.set(f.gift_suggestion_id, {
        action: f.action,
        created_at: f.created_at,
      });
    }
  }
  const decisions = Array.from(latestDecision.values());
  const chose = decisions.filter((d) => d.action === "chose");
  const runsByWeekOk = bucketWeekly(
    runs.filter((r) => r.status === "ok").map((r) => r.created_at),
    now
  );
  const runsByWeekAll = bucketWeekly(
    runs.map((r) => r.created_at),
    now
  );
  const runs7dRows = runs.filter((r) => r.created_at >= cutoff7d);

  // Roll annual occasions forward before windowing — they are often stored
  // with a past date. Occasions belong to recipients; drop the team's via
  // the recipient map.
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const windowEnd = now + 30 * 24 * 60 * 60 * 1000;
  const recipientOwner = new Map(allRecipients.map((r) => [r.id, r.user_id]));
  const upcomingOccasions30d = occasions.filter((o) => {
    const owner = recipientOwner.get(o.recipient_id);
    if (owner === undefined || adminIds.has(owner)) return false;
    const occ = nextOccurrenceMs(o.date, o.is_annual ?? true, todayStart);
    return !Number.isNaN(occ) && occ >= todayStart && occ <= windowEnd;
  }).length;

  const trialTally = tally(users.map((u) => u.trial_status));
  const subTally = tally(users.map((u) => u.subscription_status));

  return {
    totalUsers,
    newUsers7d,
    activeUsers7d: activeIds.size,
    activationPct:
      totalUsers === 0
        ? 0
        : Math.round((100 * usersWithRecipient) / totalUsers),
    giftsChosenTotal: chose.length,
    giftsChosen7d: chose.filter((d) => d.created_at >= cutoff7d).length,
    signupsByWeek: bucketWeekly(
      signups.map((e) => e.created_at),
      now
    ),
    clicksByWeek: bucketWeekly(
      clicks.map((c) => c.created_at),
      now
    ),
    runsByWeek: runsByWeekAll.map((week, i) => ({
      weekStart: week.weekStart,
      ok: runsByWeekOk[i].count,
      shortfall: week.count - runsByWeekOk[i].count,
    })),
    feedbackActions: Object.entries(tally(decisions.map((d) => d.action)))
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count),
    upcomingOccasions30d,
    trialStatusCounts: Object.entries(trialTally)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    subscriptionStatusCounts: Object.entries(subTally)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    runs7d: {
      total: runs7dRows.length,
      ok: runs7dRows.filter((r) => r.status === "ok").length,
      errors: runs7dRows.filter((r) => r.status === "error").length,
      timeouts: runs7dRows.filter((r) => r.timeout_hit).length,
    },
  };
}

export interface UserExportRow {
  user_id: string;
  /** YYYY-MM-DD of the earliest signed_up event; "" for users who predate the
   * event sink (see SIGNUP_SINK_START in the dashboard) and have none. */
  signup_date: string;
  num_recipients: number;
  added_person: boolean;
  active_7d: boolean;
  gifts_chosen: number;
  trial_status: string;
  subscription_status: string;
}

/**
 * One row per non-admin user for the Traction CSV export. Uses the same source
 * tables, admin exclusion, and definitions as fetchTractionMetrics, so the
 * per-user rows line up with the tiles: added_person → "Added a person",
 * active_7d → "Active this week", sum(gifts_chosen) → "Gifts chosen".
 *
 * One deliberate difference: the tiles count raw event/recipient rows, whereas
 * this emits a row only per profile. So an activity row whose user_id has no
 * profile — possible only for recipients, whose user_id is nullable — counts
 * toward the tile but has no CSV row to land on. There are none today; if that
 * changes the tiles could read one higher than the CSV sums. The CSV is the
 * stricter side (it can't attribute activity to a user that doesn't exist).
 *
 * Paginates through PostgREST's max-rows clamp and aggregates client-side, the
 * same trade the dashboard makes.
 */
export async function fetchUserExportRows(): Promise<UserExportRow[]> {
  const now = Date.now();
  const cutoff7d = new Date(now - WEEK_MS).toISOString();

  const [
    profiles,
    allRecipients,
    signupRows,
    events7d,
    allClicks,
    allFeedback,
  ] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("profiles")
        .select("id, is_admin, trial_status, subscription_status")
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("recipients")
        .select("id, user_id")
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("product_events")
        .select("user_id, created_at")
        .eq("event_name", "signed_up")
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("product_events")
        .select("user_id")
        .gte("created_at", cutoff7d)
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("outbound_clicks")
        .select("user_id, created_at")
        .gte("created_at", cutoff7d)
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("gift_feedback")
        .select("user_id, gift_suggestion_id, action, created_at")
        .order("id")
        .range(from, to)
    ),
  ]);

  const adminIds = new Set(profiles.filter((p) => p.is_admin).map((p) => p.id));
  const users = profiles.filter((p) => !p.is_admin);

  const recipientCount = new Map<string, number>();
  for (const r of allRecipients) {
    if (adminIds.has(r.user_id)) continue;
    recipientCount.set(r.user_id, (recipientCount.get(r.user_id) ?? 0) + 1);
  }

  // Earliest signed_up event per user is the closest thing to a signup date —
  // profiles has no created_at column.
  const signupMs = new Map<string, number>();
  for (const e of signupRows) {
    if (adminIds.has(e.user_id)) continue;
    const t = new Date(e.created_at).getTime();
    if (Number.isNaN(t)) continue;
    const prev = signupMs.get(e.user_id);
    if (prev === undefined || t < prev) signupMs.set(e.user_id, t);
  }

  // Active = any engagement row in the trailing 7 days, mirroring the tile.
  const active = new Set<string>();
  for (const e of events7d) active.add(e.user_id);
  for (const c of allClicks)
    if (c.created_at >= cutoff7d) active.add(c.user_id);
  for (const f of allFeedback)
    if (f.created_at >= cutoff7d) active.add(f.user_id);
  for (const id of adminIds) active.delete(id);

  // Latest decision per gift, attributed to the user on that latest row (see
  // fetchTractionMetrics for why free-text "gift_feedback" rows are skipped);
  // summing the per-user "chose" counts reproduces the Gifts-chosen total.
  const latest = new Map<
    string,
    { action: string; created_at: string; user_id: string }
  >();
  for (const f of allFeedback) {
    if (adminIds.has(f.user_id)) continue;
    if (f.action === "gift_feedback" || !f.gift_suggestion_id) continue;
    const prev = latest.get(f.gift_suggestion_id);
    if (!prev || f.created_at >= prev.created_at) {
      latest.set(f.gift_suggestion_id, {
        action: f.action,
        created_at: f.created_at,
        user_id: f.user_id,
      });
    }
  }
  const chosenCount = new Map<string, number>();
  for (const d of latest.values()) {
    if (d.action !== "chose") continue;
    chosenCount.set(d.user_id, (chosenCount.get(d.user_id) ?? 0) + 1);
  }

  return users
    .map((u) => {
      const ms = signupMs.get(u.id);
      const n = recipientCount.get(u.id) ?? 0;
      return {
        user_id: u.id,
        signup_date: ms === undefined ? "" : localDateString(ms),
        num_recipients: n,
        added_person: n > 0,
        active_7d: active.has(u.id),
        gifts_chosen: chosenCount.get(u.id) ?? 0,
        trial_status: u.trial_status ?? "",
        subscription_status: u.subscription_status ?? "",
      };
    })
    .sort((a, b) => b.signup_date.localeCompare(a.signup_date));
}

// Jira workflow status bucket, mapped from statusCategory.key so the dashboard
// doesn't hardcode every workflow status name.
export type TicketStatusCategory = "todo" | "in_progress" | "done" | "unknown";

// One piece of user feedback, with the ticket it spawned (if any) resolved to
// its live Jira status. The dashboard is feedback-centric — a ticket only
// appears inline on the feedback that produced it, never as a standalone list.
export interface RawFeedbackItem {
  id: string;
  message: string;
  reporter: string | null;
  createdAt: string; // ISO timestamp
  resolved: boolean; // resolved in Sentry (typically because it was triaged)
  jiraKey: string | null; // set when a mapping row links this feedback to a ticket
  jiraUrl: string | null; // deep link to the linked ticket
  statusName: string | null; // live Jira status of the linked ticket
  statusCategory: TicketStatusCategory | null;
}

export interface FeedbackDashboard {
  rawFeedback: RawFeedbackItem[];
  // Per-source failure notices (generic, safe to show). Present when Jira or
  // Sentry was unreachable but the other source still returned — a partial load
  // rather than a total failure.
  errors: { jira: string | null; sentry: string | null };
}

/**
 * Feedback & tickets dashboard data for the admin viewer. Proxied through the
 * admin-feedback-tickets edge function because Jira and Sentry are only
 * reachable server-side (their tokens must never ship in the client). The
 * function verifies the caller is an admin before returning anything.
 */
export async function fetchFeedbackDashboard(): Promise<FeedbackDashboard> {
  const { data, error } = await invokeWithRetry<FeedbackDashboard>(
    "admin-feedback-tickets",
    { body: {} }
  );
  if (error) throw error;
  return {
    rawFeedback: data?.rawFeedback ?? [],
    errors: {
      jira: data?.errors?.jira ?? null,
      sentry: data?.errors?.sentry ?? null,
    },
  };
}
