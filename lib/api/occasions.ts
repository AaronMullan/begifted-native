/**
 * Occasions API.
 */

import { supabase } from "../supabase";
import {
  getNextOccurrence,
  nextBirthdayOccurrence,
} from "../../utils/occasion-dates";
import { parseBirthdayRange } from "../../utils/birthday";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface Occasion {
  id: string;
  /** ISO date, or null for an occasion whose real date isn't known yet. */
  date: string | null;
  occasion_type: string;
  recipient_id: string;
  /** Whether the occasion repeats every year (birthdays, anniversaries) or is one-time. */
  is_annual: boolean;
  /** Outcome of the last generation run: success | no_results | error. Only
   * the single-occasion and per-recipient fetches select it. */
  last_generation_status?: string | null;
  /** Set while a generation run is in flight; see the column comment. */
  generation_started_at?: string | null;
  fulfilled_at?: string | null;
  recipient?: {
    name: string;
    relationship_type: string;
    photo_url: string | null;
    /** recipients.birthday, so a birthday moment can show approximate timing. */
    birthday?: string | null;
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
    .select("id, name, relationship_type, photo_url, birthday")
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
            birthday: recipient.birthday ?? null,
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

  // Throw network failures too — returned as [] they read as "no upcoming
  // moments" on Home. Sentry already drops network-shaped errors.
  if (occasionsError) throw occasionsError;

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
    .select(
      "id, date, occasion_type, recipient_id, is_annual, last_generation_status, generation_started_at, fulfilled_at"
    )
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
    .select(
      "id, date, occasion_type, recipient_id, is_annual, last_generation_status, generation_started_at, fulfilled_at"
    )
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
  const { data, error } = await supabase
    .from("occasions")
    .update(fields)
    .eq("id", occasionId)
    .select("recipient_id, user_id");

  if (error) throw error;
  // Turning a moment into Birthday is adding Birthday back.
  const updated = data?.[0];
  if (fields.occasion_type === "birthday" && updated?.recipient_id) {
    await setBirthdayMomentSuppressed(
      updated.user_id,
      updated.recipient_id,
      false
    );
  }
}

/**
 * Keep a recipient's Birthday moment in step with their birthday. A known
 * birthday gets a moment unless the user deleted it (birthday_moment_suppressed),
 * in which case editing the birthday never brings it back; a Birthday moment
 * that does exist is always re-dated. Removing the birthday removes the moment
 * and forgets the deletion, so a birthday added later starts fresh. The gift
 * cron only re-dates birthday occasions once the birthday is inside the
 * notification window, so without this an edit made months ahead leaves the
 * moment on the old day until then. Resolves true when it created or moved a
 * moment.
 */
export async function syncBirthdayOccasion(
  userId: string,
  recipientId: string,
  birthday: string | null
): Promise<boolean> {
  if (!birthday) {
    const { error: deleteError } = await supabase
      .from("occasions")
      .delete()
      .eq("recipient_id", recipientId)
      .eq("user_id", userId)
      .eq("occasion_type", "birthday");
    if (deleteError) throw deleteError;
    await setBirthdayMomentSuppressed(userId, recipientId, false);
    return false;
  }

  // An approximate birthday dates the moment on the first day of its range.
  const date = getNextOccurrence(
    parseBirthdayRange(birthday)
      ? (nextBirthdayOccurrence(birthday) ?? birthday)
      : birthday
  );
  if (!ISO_DATE.test(date)) return false;

  const { data: existing, error: existingError } = await supabase
    .from("occasions")
    .select("id, date")
    .eq("recipient_id", recipientId)
    .eq("user_id", userId)
    .eq("occasion_type", "birthday")
    .maybeSingle();
  if (existingError) throw existingError;

  if (!existing) {
    const { data: recipient, error: recipientError } = await supabase
      .from("recipients")
      .select("birthday_moment_suppressed")
      .eq("id", recipientId)
      .eq("user_id", userId)
      .maybeSingle();
    if (recipientError) throw recipientError;
    if (!recipient || recipient.birthday_moment_suppressed) return false;

    const { error: insertError } = await supabase.from("occasions").insert({
      user_id: userId,
      recipient_id: recipientId,
      date,
      occasion_type: "birthday",
      is_annual: true,
    });
    // A concurrent sync already created it.
    if (insertError?.code === "23505") return false;
    if (insertError) throw insertError;
    return true;
  }
  if (existing.date === date) return false;

  const { error } = await supabase
    .from("occasions")
    // Same reset the cron applies when it moves a date. Once the date is
    // already right the cron sees no change and never clears these, so a
    // gift chosen for the old cycle would silence the next birthday.
    .update({
      date,
      fulfilled_at: null,
      last_generated_at: null,
      last_generation_status: null,
    })
    .eq("id", existing.id);

  if (error) throw error;
  return true;
}

async function setBirthdayMomentSuppressed(
  userId: string,
  recipientId: string,
  suppressed: boolean
): Promise<void> {
  const { error } = await supabase
    .from("recipients")
    .update({ birthday_moment_suppressed: suppressed })
    .eq("id", recipientId)
    .eq("user_id", userId);
  if (error) throw error;
}

/**
 * The occasions table enforces one occasion per recipient per type
 * (occasions_recipient_type_idx), so re-adding an existing moment is an
 * expected user action, not a defect. Callers show this message and Sentry
 * capture is skipped for it.
 */
export class DuplicateOccasionError extends Error {
  constructor() {
    super("They already have this moment.");
    this.name = "DuplicateOccasionError";
  }
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
  // Adding Birthday back by hand undoes an earlier deletion of it. Cleared
  // before the insert: if the insert then fails, nothing was suppressed that
  // the user wasn't already asking to track.
  if (occasionType === "birthday") {
    await setBirthdayMomentSuppressed(userId, recipientId, false);
  }
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

  if (error) {
    if (error.code === "23505") throw new DuplicateOccasionError();
    throw error;
  }
  return {
    ...data,
    occasion_type: data.occasion_type || occasionType,
    is_annual: data.is_annual ?? isAnnual,
  };
}

/**
 * Delete a single occasion. Deleting a Birthday moment for someone whose
 * birthday is known is remembered on the recipient, so later birthday edits
 * and the gift cron don't recreate it. The flag is set before the delete: if
 * the delete then fails, the moment still exists and is still maintained,
 * whereas the reverse order would leave it gone but free to come back.
 */
export async function deleteOccasion(occasionId: string): Promise<void> {
  const { data: occasion, error: readError } = await supabase
    .from("occasions")
    .select("occasion_type, recipient_id, user_id")
    .eq("id", occasionId)
    .maybeSingle();
  if (readError) throw readError;

  if (occasion?.occasion_type === "birthday" && occasion.recipient_id) {
    const { error: flagError } = await supabase
      .from("recipients")
      .update({ birthday_moment_suppressed: true })
      .eq("id", occasion.recipient_id)
      .eq("user_id", occasion.user_id)
      // With no birthday there is nothing to keep from coming back, and a
      // birthday added later should get its moment as normal.
      .not("birthday", "is", null);
    if (flagError) throw flagError;
  }

  const { error } = await supabase
    .from("occasions")
    .delete()
    .eq("id", occasionId);

  if (error) throw error;
}
