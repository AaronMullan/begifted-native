/**
 * Gift suggestions, feedback, and outbound-click API.
 */

import { supabase } from "../supabase";
import type { GiftSuggestion } from "../../types/recipient";

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
      Array.isArray(rawRecipient) ? (rawRecipient[0] ?? null) : rawRecipient
    ) as OutboundClickRow["recipient"];
    const rawGift = (r.gift_suggestions ?? null) as unknown;
    const giftSuggestion = (
      Array.isArray(rawGift) ? (rawGift[0] ?? null) : rawGift
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
