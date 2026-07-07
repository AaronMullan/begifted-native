/**
 * Supabase API layer
 * Centralized functions for all data fetching operations
 */

import { supabase } from "./supabase";
import type { Recipient, GiftSuggestion } from "../types/recipient";

export interface UserSummary {
  user_summary: string;
  taste_and_world: string[];
  care_and_relationship_style: string[];
  giver_style_implications: string[];
  things_to_avoid: string[];
  /**
   * Free-form phrase describing the user's default gifting tone, seeded from
   * onboarding. Used as the fallback tone for recipients who have none set.
   * Optional because rows extracted before this field shipped won't have it.
   */
  default_emotional_tone?: string;
  confidence: "low" | "medium" | "high";
}

export interface UserPreferences {
  user_id: string;
  onboarding_completed: boolean;
  user_description: string | null;
  user_summary: UserSummary | null;
  synthesized_giver_profile: string | null;
  auto_fallback_enabled: boolean;
  notification_lead_days: number;
}

/**
 * Fetch user preferences for a user
 */
export async function fetchUserPreferences(
  userId: string
): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  name?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  billing_address_street?: string;
  billing_address_city?: string;
  billing_address_state?: string;
  billing_address_zip?: string;
  is_admin?: boolean;
}

export interface Occasion {
  id: string;
  date: string;
  occasion_type: string;
  recipient_id: string;
  /** Whether the occasion repeats every year (birthdays, anniversaries) or is one-time. */
  is_annual: boolean;
  recipient?: {
    name: string;
    relationship_type: string;
    photo_url: string | null;
  };
}

/**
 * Fetch all recipients for a user
 */
export async function fetchRecipients(userId: string): Promise<Recipient[]> {
  const { data, error } = await supabase
    .from("recipients")
    .select(
      "id, name, relationship_type, interests, birthday, emotional_tone_preference, gift_budget_min, gift_budget_max, address, address_line_2, city, state, zip_code, country, photo_url, synthesized_profile, known_roles, household_context, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single recipient by ID
 */
export async function fetchRecipient(
  userId: string,
  recipientId: string
): Promise<Recipient> {
  const { data, error } = await supabase
    .from("recipients")
    .select("*")
    .eq("id", recipientId)
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}

type OccasionRow = {
  id: string;
  date: string;
  occasion_type: string | null;
  recipient_id: string;
  is_annual: boolean | null;
};

/**
 * Attach each occasion's recipient (name/relationship/photo) so callers can
 * render person cards without a second query. A recipient lookup failure is
 * non-fatal — the occasion still returns, just without hydrated recipient info.
 */
async function hydrateOccasionRecipients(
  occasionsData: OccasionRow[]
): Promise<Occasion[]> {
  if (occasionsData.length === 0) return [];

  const recipientIds = [...new Set(occasionsData.map((o) => o.recipient_id))];
  const { data: recipientsData, error: recipientsError } = await supabase
    .from("recipients")
    .select("id, name, relationship_type, photo_url")
    .in("id", recipientIds);

  // A failed recipients fetch must fail the whole occasions query rather than
  // resolve to name-less occasions. Swallowing it caches occasions whose
  // `recipient` is undefined, and the Home/Moments cards then render every
  // event as "Someone"/"Unknown" — the name looks lost on cold open. Throwing
  // lets the query retry and keep the last good (named) data instead. A
  // recipient that is genuinely absent (no error, id not returned) still falls
  // back to the placeholder below, which is correct.
  if (recipientsError) throw recipientsError;

  const recipientsMap = new Map((recipientsData || []).map((r) => [r.id, r]));

  return occasionsData.map((occasion) => {
    const recipient = recipientsMap.get(occasion.recipient_id);
    return {
      id: occasion.id,
      date: occasion.date,
      occasion_type: occasion.occasion_type || "birthday",
      recipient_id: occasion.recipient_id,
      is_annual: occasion.is_annual ?? true,
      recipient: recipient
        ? {
            name: recipient.name,
            relationship_type: recipient.relationship_type,
            photo_url: recipient.photo_url ?? null,
          }
        : undefined,
    };
  });
}

/**
 * Fetch occasions for a user (upcoming, within 90 days)
 */
export async function fetchOccasions(userId: string): Promise<Occasion[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: occasionsData, error: occasionsError } = await supabase
    .from("occasions")
    .select("id, date, occasion_type, recipient_id, is_annual")
    .eq("user_id", userId)
    .gte("date", today.toISOString().split("T")[0])
    .order("date", { ascending: true });

  if (occasionsError) {
    const msg =
      occasionsError instanceof Error
        ? occasionsError.message
        : String(occasionsError);
    if (msg.includes("Network request failed") || msg.includes("timed out")) {
      return [];
    }
    throw occasionsError;
  }

  return hydrateOccasionRecipients(occasionsData || []);
}

/**
 * Fetch occasions for a specific recipient
 */
export async function fetchRecipientOccasions(
  recipientId: string
): Promise<Occasion[]> {
  const { data, error } = await supabase
    .from("occasions")
    .select("id, date, occasion_type, recipient_id, is_annual")
    .eq("recipient_id", recipientId)
    .order("date", { ascending: true });

  if (error) throw error;
  return (data || []).map((o) => ({
    ...o,
    occasion_type: o.occasion_type || "birthday",
    is_annual: o.is_annual ?? true,
  }));
}

/**
 * Fetch every occasion for a user with no date filter. Unlike fetchOccasions
 * (which drops anything before today), this keeps past-dated annual occasions
 * so callers can roll them forward to their next occurrence client-side — the
 * People screen needs each recipient's soonest upcoming moment, and annual
 * occasions (birthdays, anniversaries) are often stored with a past date. The
 * calendar also relies on this to keep markers (and their person cards) on days
 * whose occasion has already passed.
 */
export async function fetchAllOccasions(userId: string): Promise<Occasion[]> {
  const { data, error } = await supabase
    .from("occasions")
    .select("id, date, occasion_type, recipient_id, is_annual")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) throw error;
  return hydrateOccasionRecipients(data || []);
}

/**
 * Update an occasion's date and/or type
 */
export async function updateOccasion(
  occasionId: string,
  fields: { date?: string; occasion_type?: string; is_annual?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from("occasions")
    .update(fields)
    .eq("id", occasionId);

  if (error) throw error;
}

/**
 * Create a new occasion for a recipient
 */
export async function createOccasion(
  userId: string,
  recipientId: string,
  date: string,
  occasionType: string,
  isAnnual: boolean = true
): Promise<Occasion> {
  const { data, error } = await supabase
    .from("occasions")
    .insert({
      user_id: userId,
      recipient_id: recipientId,
      date,
      occasion_type: occasionType,
      is_annual: isAnnual,
    })
    .select("id, date, occasion_type, recipient_id, is_annual")
    .single();

  if (error) throw error;
  return {
    ...data,
    occasion_type: data.occasion_type || occasionType,
    is_annual: data.is_annual ?? isAnnual,
  };
}

/**
 * Delete a single occasion
 */
export async function deleteOccasion(occasionId: string): Promise<void> {
  const { error } = await supabase
    .from("occasions")
    .delete()
    .eq("id", occasionId);

  if (error) throw error;
}

/**
 * Fetch user profile
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error, status } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && status !== 406) throw error;

  return data || null;
}

/**
 * Fetch gift suggestions for a recipient
 */
export async function fetchGiftSuggestions(
  recipientId: string
): Promise<GiftSuggestion[]> {
  // Fetch suggestions and any "removal" feedback in parallel so rejected/owned/
  // problem gifts stay hidden across refetches, not just optimistically (DEV-108).
  const [suggestionsRes, removedRes] = await Promise.all([
    supabase
      .from("gift_suggestions")
      .select("*")
      .eq("recipient_id", recipientId)
      .not("price", "is", null)
      .gt("price", 0)
      .order("generated_at", { ascending: false }),
    supabase
      .from("gift_feedback")
      .select("gift_suggestion_id")
      .eq("recipient_id", recipientId)
      .in("action", GIFT_REMOVAL_ACTIONS),
  ]);

  if (suggestionsRes.error) throw suggestionsRes.error;
  if (removedRes.error) throw removedRes.error;

  const removedIds = new Set(
    (removedRes.data ?? []).map((row) => row.gift_suggestion_id)
  );

  return (suggestionsRes.data ?? []).filter((s) => !removedIds.has(s.id));
}

export const GIFT_FEEDBACK_ACTIONS = [
  "keep_in_mix",
  "chose",
  "already_have",
  "not_for_them",
  "price_off",
  "product_problem",
  "remove",
  // Free-text "Gift feedback" (DEV-109): its own action so it maps to the
  // `free_text_feedback` signal instead of being overloaded onto keep_in_mix.
  "gift_feedback",
] as const;

export type GiftFeedbackAction = (typeof GIFT_FEEDBACK_ACTIONS)[number];

/**
 * Normalized signal carried by every feedback event (DEV-109). Derived from
 * `action` by a Postgres trigger (`gift_feedback_signal_for_action`) — the DB
 * is the source of truth, so downstream consumers (generation context,
 * signal-specific CIS) don't treat every rejection as the same kind.
 */
export const GIFT_FEEDBACK_SIGNAL_TYPES = [
  "neutral_or_soft_positive",
  "strong_positive",
  "owned_item",
  "negative_taste",
  "budget_feedback",
  "product_quality_issue",
  "display_removal_or_weak_negative",
  "free_text_feedback",
] as const;

export type GiftFeedbackSignalType =
  (typeof GIFT_FEEDBACK_SIGNAL_TYPES)[number];

/**
 * Feedback actions that mean "this gift no longer belongs in the visible list"
 * (DEV-108). These mirror the actions the backend `append_rejected_gift_to_avoid_list`
 * trigger reacts to. `keep_in_mix`, `chose`, and free-text notes do NOT remove a gift.
 */
export const GIFT_REMOVAL_ACTIONS: GiftFeedbackAction[] = [
  "already_have",
  "not_for_them",
  "price_off",
  "product_problem",
  "remove",
];

export interface GiftFeedback {
  id: string;
  user_id: string;
  recipient_id: string;
  gift_suggestion_id: string;
  occasion_id: string | null;
  action: GiftFeedbackAction;
  // DEV-109: normalized signal + denormalized gift fields, populated by the
  // BEFORE INSERT trigger so consumers needn't join back to gift_suggestions.
  signal_type: GiftFeedbackSignalType;
  gift_title: string | null;
  price: number | null;
  category_tags: string[] | null;
  notes: string | null;
  created_at: string;
}

export interface InsertGiftFeedbackInput {
  user_id: string;
  recipient_id: string;
  gift_suggestion_id: string;
  occasion_id?: string | null;
  action: GiftFeedbackAction;
  notes?: string | null;
}

/**
 * Insert a gift feedback row (DEV-48). Append-only — multiple rows per gift
 * are allowed; downstream consumers should read the latest by created_at.
 */
export async function insertGiftFeedback(
  input: InsertGiftFeedbackInput
): Promise<GiftFeedback> {
  const { data, error } = await supabase
    .from("gift_feedback")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export interface OutboundClick {
  id: string;
  user_id: string;
  recipient_id: string;
  gift_suggestion_id: string | null;
  occasion_id: string | null;
  product_url: string;
  retailer_domain: string | null;
  platform: string | null;
  created_at: string;
}

export interface InsertOutboundClickInput {
  user_id: string;
  recipient_id: string;
  gift_suggestion_id?: string | null;
  occasion_id?: string | null;
  product_url: string;
  retailer_domain?: string | null;
  platform?: string | null;
}

/**
 * Log an outbound product-page click (DEV-151). Append-only engagement signal
 * fired when a user taps a product CTA; not a purchase-conversion metric.
 */
export async function insertOutboundClick(
  input: InsertOutboundClickInput
): Promise<OutboundClick> {
  const { data, error } = await supabase
    .from("outbound_clicks")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** A single outbound click with its recipient/gift joined, for the admin viewer. */
export interface OutboundClickRow {
  id: string;
  created_at: string;
  product_url: string;
  retailer_domain: string | null;
  platform: string | null;
  recipient: { id: string; name: string } | null;
  gift_suggestion: { id: string; title: string } | null;
}

export interface OutboundClicksPage {
  clicks: OutboundClickRow[];
  total: number;
}

/**
 * Fetch a page of outbound clicks newest-first for the admin engagement viewer
 * (DEV-151). Joins recipient name + gift title; relies on the admin RLS read
 * policy on outbound_clicks. Returns the total count for pagination.
 */
export async function fetchOutboundClicks(
  limit: number,
  offset: number
): Promise<OutboundClicksPage> {
  const { data, error, count } = await supabase
    .from("outbound_clicks")
    .select(
      `id, created_at, product_url, retailer_domain, platform,
       recipients ( id, name ),
       gift_suggestions ( id, title )`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Embedded to-one relations come back as an object or (depending on the
  // client's inference) a single-element array — normalize both, like
  // fetchRecentRuns does.
  const clicks: OutboundClickRow[] = (data ?? []).map((r) => {
    const rawRecipient = (r.recipients ?? null) as unknown;
    const recipient = (
      Array.isArray(rawRecipient) ? rawRecipient[0] ?? null : rawRecipient
    ) as OutboundClickRow["recipient"];
    const rawGift = (r.gift_suggestions ?? null) as unknown;
    const giftSuggestion = (
      Array.isArray(rawGift) ? rawGift[0] ?? null : rawGift
    ) as OutboundClickRow["gift_suggestion"];
    return {
      id: r.id,
      created_at: r.created_at,
      product_url: r.product_url,
      retailer_domain: r.retailer_domain,
      platform: r.platform,
      recipient,
      gift_suggestion: giftSuggestion,
    };
  });

  return { clicks, total: count ?? 0 };
}

/** be-gifted backend base URL (Vercel). Same host the prompt playground uses. */
const BEGIFTED_BACKEND_URL = "https://be-gifted.vercel.app";

/**
 * Ask the backend to top the visible gift list back up to 3 after a removal
 * (DEV-118). Fire-and-forget: the backend generates only the deficit (so
 * un-dismissed suggestions are preserved), dedupes against history + the avoid
 * list, and stores the replacement. Failures are swallowed — a missed backfill
 * self-heals on the next daily generation run.
 */
export async function triggerGiftBackfill(
  recipientId: string,
  occasionId?: string | null
): Promise<void> {
  try {
    // The backend verifies this JWT and recipient ownership; without a
    // session the request would 401, so skip the doomed call entirely.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`${BEGIFTED_BACKEND_URL}/api/generate-gifts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        recipientId,
        mode: "backfill",
        occasionId: occasionId ?? undefined,
      }),
    });
  } catch (err) {
    console.warn("[backfill] trigger failed (non-blocking):", err);
  }
}

/**
 * Fetch all gift feedback rows for a recipient, newest first.
 */
export async function fetchGiftFeedbackForRecipient(
  recipientId: string
): Promise<GiftFeedback[]> {
  const { data, error } = await supabase
    .from("gift_feedback")
    .select("*")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch notifications for a user (most recent 50)
 */
export async function fetchNotifications(
  userId: string
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("app_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

/**
 * Fetch unread notification count for a user
 */
export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("app_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw error;
  return count || 0;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from("app_notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("app_notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw error;
}

// ============================================================================
// Admin — Prompt Playground
// ============================================================================

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

/**
 * Fetch all profiles (admin-only, for giver selection)
 */
export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

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

export interface AppConfig {
  id: number;
  recommendations_enabled: boolean;
  notifications_enabled: boolean;
  signups_enabled: boolean;
  ai_provider: "openai" | "anthropic" | "google";
  ai_model: string;
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
            ? (raw[0] as RecipientEmbed | undefined) ?? null
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
      ? (rawRecipients[0] as RecipientEmbed | undefined) ?? null
      : (rawRecipients as RecipientEmbed | null);
    const occasion: OccasionEmbed | null = Array.isArray(rawOccasions)
      ? (rawOccasions[0] as OccasionEmbed | undefined) ?? null
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
            ? promptVersionById.get(r.protocol_prompt_id) ?? null
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
