/**
 * Supabase API layer
 * Centralized functions for all data fetching operations
 */

import { supabase } from "./supabase";
import type { Recipient, GiftSuggestion } from "../types/recipient";

export interface UserPreferences {
  user_id: string;
  onboarding_completed: boolean;
  user_description: string | null;
  gifting_style_text: string | null;
  user_stack: {
    philosophy?: string;
    creativity?: string;
    budget_style?: string;
    planning_style?: string;
  } | null;
  default_gifting_tone: string | null;
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

  if (error) {
    console.error("Error fetching user preferences:", error);
    return null;
  }

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
      "id, name, relationship_type, interests, birthday, emotional_tone_preference, gift_budget_min, gift_budget_max, address, address_line_2, city, state, zip_code, country, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

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
    if (!msg.includes("Network request failed") && !msg.includes("timed out")) {
      console.error("Error fetching occasions:", occasionsError);
    }
    return [];
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
      console.error("Error fetching recipients:", recipientsError);
    }
  }

  // Create a map of recipients for quick lookup
  const recipientsMap = new Map((recipientsData || []).map((r) => [r.id, r]));

  // Transform the data to include recipient info
  const transformedOccasions: Occasion[] = occasionsData.map(
    (occasion: any) => {
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

  if (error && status !== 406) {
    console.error("Error fetching profile:", error);
    // If profile doesn't exist, return null (we'll create it on save)
    return null;
  }

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
  recipient_id: string;
  custom_system_prompt: string;
  original_system_prompt: string;
  chat_messages: { role: string; content: string }[];
  generation_result: Record<string, unknown> | null;
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
      "id, name, relationship_type, interests, birthday, emotional_tone_preference, gift_budget_min, gift_budget_max, address, address_line_2, city, state, zip_code, country, created_at, updated_at"
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
  _userId: string
): Promise<PromptTestRun[]> {
  const { data, error } = await supabase
    .from("prompt_test_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

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
