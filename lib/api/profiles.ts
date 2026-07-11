/**
 * User profile + preferences API.
 */

import { supabase } from "../supabase";

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

/**
 * Upsert a partial set of user-preference fields (keyed on user_id).
 */
export async function upsertUserPreferences(
  userId: string,
  fields: Partial<Omit<UserPreferences, "user_id">>
): Promise<void> {
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      ...fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  billing_address_street?: string;
  billing_address_city?: string;
  billing_address_state?: string;
  billing_address_zip?: string;
  billing_address_country?: string;
  push_notifications_enabled?: boolean;
  email_notifications_enabled?: boolean;
  is_admin?: boolean;
  updated_at?: string;
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
