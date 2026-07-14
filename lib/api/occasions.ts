/**
 * Occasions API.
 */

import { supabase } from "../supabase";

export interface Occasion {
  id: string;
  /** ISO date, or null for an occasion whose real date isn't known yet. */
  date: string | null;
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

type OccasionRow = {
  id: string;
  date: string | null;
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
 * Fetch a single occasion by ID. Returns null when the row no longer exists
 * (e.g. a stale occasion filter from a notification tap).
 */
export async function fetchOccasion(
  occasionId: string
): Promise<Occasion | null> {
  const { data, error } = await supabase
    .from("occasions")
    .select("id, date, occasion_type, recipient_id, is_annual")
    .eq("id", occasionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    occasion_type: data.occasion_type || "birthday",
    is_annual: data.is_annual ?? true,
  };
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
  date: string | null,
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
