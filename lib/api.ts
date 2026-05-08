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
  confidence: "low" | "medium" | "high";
}

export interface UserPreferences {
  user_id: string;
  onboarding_completed: boolean;
  user_description: string | null;
  gifting_style_text: string | null;
  user_summary: UserSummary | null;
  synthesized_giver_profile: string | null;
  reminder_days: number;
  auto_fallback_enabled: boolean;
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
  recipient?: {
    name: string;
    relationship_type: string;
  };
}

/**
 * Fetch all recipients for a user
 */
export async function fetchRecipients(userId: string): Promise<Recipient[]> {
  const { data, error } = await supabase
    .from("recipients")
    .select(
      "id, name, relationship_type, interests, birthday, emotional_tone_preference, gift_budget_min, gift_budget_max, address, address_line_2, city, state, zip_code, country, photo_url, synthesized_profile, created_at, updated_at"
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

/**
 * Fetch occasions for a user (upcoming, within 90 days)
 */
export async function fetchOccasions(userId: string): Promise<Occasion[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch occasions
  const { data: occasionsData, error: occasionsError } = await supabase
    .from("occasions")
    .select("id, date, occasion_type, recipient_id")
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

  if (!occasionsData || occasionsData.length === 0) {
    return [];
  }

  // Fetch recipients for the occasions
  const recipientIds = [...new Set(occasionsData.map((o) => o.recipient_id))];
  const { data: recipientsData, error: recipientsError } = await supabase
    .from("recipients")
    .select("id, name, relationship_type")
    .in("id", recipientIds);

  if (recipientsError) {
    const msg =
      recipientsError instanceof Error
        ? recipientsError.message
        : String(recipientsError);
    if (!msg.includes("Network request failed") && !msg.includes("timed out")) {
      console.error("Error fetching recipient names for occasions:", recipientsError);
    }
  }

  // Create a map of recipients for quick lookup
  const recipientsMap = new Map((recipientsData || []).map((r) => [r.id, r]));

  // Transform the data to include recipient info
  const transformedOccasions: Occasion[] = occasionsData.map((occasion) => {
      const recipient = recipientsMap.get(occasion.recipient_id);
      return {
        id: occasion.id,
        date: occasion.date,
        occasion_type: occasion.occasion_type || "birthday",
        recipient_id: occasion.recipient_id,
        recipient: recipient
          ? {
              name: recipient.name,
              relationship_type: recipient.relationship_type,
            }
          : undefined,
      };
    }
  );

  return transformedOccasions;
}

/**
 * Fetch occasions for a specific recipient
 */
export async function fetchRecipientOccasions(
  recipientId: string
): Promise<Occasion[]> {
  const { data, error } = await supabase
    .from("occasions")
    .select("id, date, occasion_type, recipient_id")
    .eq("recipient_id", recipientId)
    .order("date", { ascending: true });

  if (error) throw error;
  return (data || []).map((o) => ({
    ...o,
    occasion_type: o.occasion_type || "birthday",
  }));
}

/**
 * Update an occasion's date and/or type
 */
export async function updateOccasion(
  occasionId: string,
  fields: { date?: string; occasion_type?: string }
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
  occasionType: string
): Promise<Occasion> {
  const { data, error } = await supabase
    .from("occasions")
    .insert({
      user_id: userId,
      recipient_id: recipientId,
      date,
      occasion_type: occasionType,
    })
    .select("id, date, occasion_type, recipient_id")
    .single();

  if (error) throw error;
  return { ...data, occasion_type: data.occasion_type || occasionType };
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
  const { data, error } = await supabase
    .from("gift_suggestions")
    .select("*")
    .eq("recipient_id", recipientId)
    .not("price", "is", null)
    .gt("price", 0)
    .order("generated_at", { ascending: false });

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
export async function markAllNotificationsRead(
  userId: string
): Promise<void> {
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
      "id, name, relationship_type, interests, birthday, emotional_tone_preference, gift_budget_min, gift_budget_max, address, address_line_2, city, state, zip_code, country, photo_url, synthesized_profile, created_at, updated_at"
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
  ai_provider: 'openai' | 'anthropic' | 'google';
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
    .update({ ...flags, updated_at: new Date().toISOString(), updated_by: userId })
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
  occasion: { id: string; occasion_type: string | null; date: string | null } | null;
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
  offset: number,
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
       occasions ( id, occasion_type, date )`,
    )
    .in("run_id", pageRunIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const promptIds = Array.from(
    new Set(
      (rows ?? [])
        .map((r) => r.protocol_prompt_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
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
  type OccasionEmbed = { id: string; occasion_type: string | null; date: string | null };

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
        .filter((id): id is string => Boolean(id)),
    ),
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
            ? promptVersionById.get(r.protocol_prompt_id) ?? null
            : null,
        wrapper_template_hash: r.wrapper_template_hash,
        search_queries: (r.search_queries ?? []) as string[],
        cited_urls: (r.cited_urls ?? []) as string[],
        cited_domains: (r.cited_domains ?? []) as string[],
        recipient: recipient ? { id: recipient.id, name: recipient.name } : null,
        giver:
          recipient?.user_id
            ? { id: recipient.user_id, name: giverNameById.get(recipient.user_id) ?? null }
            : null,
        occasion: occasion
          ? { id: occasion.id, occasion_type: occasion.occasion_type, date: occasion.date }
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
  id: string,
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
  hash: string,
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
  id: string,
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
  userId: string,
): Promise<GiverProfileSnapshot | null> {
  const [{ data: profile, error: profileErr }, { data: prefs, error: prefsErr }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("id", userId).maybeSingle(),
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
