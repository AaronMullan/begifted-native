/**
 * Recipients API.
 */

import { supabase } from "../supabase";
import type { Recipient } from "../../types/recipient";

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
