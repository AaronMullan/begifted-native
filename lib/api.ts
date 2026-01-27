/**
 * Supabase API layer
 * Centralized functions for all data fetching operations
 */

import { supabase } from "./supabase";
import type { Recipient, GiftSuggestion } from "../types/recipient";

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
}

export interface DashboardStats {
  username: string;
  recipientsCount: number;
  upcomingCount: number;
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
export async function fetchRecipients(
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
    console.error("Error fetching occasions:", occasionsError);
    return [];
  }

  if (!occasionsData || occasionsData.length === 0) {
    return [];
  }

  // Fetch recipients for the occasions
  const recipientIds = [
    ...new Set(occasionsData.map((o) => o.recipient_id)),
  ];
  const { data: recipientsData, error: recipientsError } = await supabase
    .from("recipients")
    .select("id, name, relationship_type")
    .in("id", recipientIds);

  if (recipientsError) {
    console.error("Error fetching recipients:", recipientsError);
  }

  // Create a map of recipients for quick lookup
  const recipientsMap = new Map(
    (recipientsData || []).map((r) => [r.id, r])
  );

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

const FETCH_TIMEOUT_MS = 12_000;

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function fallbackStats(userEmail?: string): DashboardStats {
  return {
    username: userEmail ? userEmail.split("@")[0] : "",
    recipientsCount: 0,
    upcomingCount: 0,
  };
}

/**
 * Fetch dashboard statistics
 */
export async function fetchDashboardStats(
  userId: string,
  userEmail?: string
): Promise<DashboardStats> {
  let username = userEmail ? userEmail.split("@")[0] : "";
  let recipientsCount = 0;
  let upcomingCount = 0;

  try {
    try {
      const { data: profileData, error: profileError } = await withTimeout(
        supabase
          .from("profiles")
          .select("username")
          .eq("id", userId)
          .single(),
        FETCH_TIMEOUT_MS,
        "profiles"
      );

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching profile:", profileError?.message ?? profileError);
      }
      if (profileData?.username) {
        username = profileData.username;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("Network request failed") && !msg.includes("timed out")) {
        console.error("Error fetching profile for dashboard:", e);
      }
    }

    try {
      const { count: rc, error: recipientsError } = await withTimeout(
        supabase
          .from("recipients")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        FETCH_TIMEOUT_MS,
        "recipients count"
      );

      if (recipientsError) {
        console.error("Error fetching recipients count:", recipientsError?.message ?? recipientsError);
      } else {
        recipientsCount = rc ?? 0;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("Network request failed") && !msg.includes("timed out")) {
        console.error("Error fetching recipients count:", e);
      }
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 90);

      const { count: oc, error: occasionsError } = await withTimeout(
        supabase
          .from("occasions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("date", today.toISOString().split("T")[0])
          .lte("date", futureDate.toISOString().split("T")[0]),
        FETCH_TIMEOUT_MS,
        "occasions count"
      );

      if (occasionsError) {
        console.error("Error fetching occasions count:", occasionsError?.message ?? occasionsError);
      } else {
        upcomingCount = oc ?? 0;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("Network request failed") && !msg.includes("timed out")) {
        console.error("Error fetching occasions count:", e);
      }
    }

    return { username, recipientsCount, upcomingCount };
  } catch (e) {
    console.error("fetchDashboardStats unexpected error:", e);
    return fallbackStats(userEmail);
  }
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
