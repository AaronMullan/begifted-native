export interface Recipient {
  id: string;
  user_id?: string;
  name: string;
  relationship_type: string;
  interests?: string[];
  /** Null once the user has removed it. */
  birthday?: string | null;
  /** Birth year derived from a volunteered age when no birthday date is known. */
  birth_year?: number | null;
  emotional_tone_preference?: string;
  gift_budget_min?: number | null;
  gift_budget_max?: number | null;
  /** The giver said there is no upper limit. Never true alongside a max. */
  gift_budget_no_ceiling?: boolean;
  address?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  aesthetic?: string[];
  avoid_list?: string[];
  conversation_summary?: string | null;
  summary_approved?: boolean;
  fallback_days_before?: number;
  photo_url?: string;
  synthesized_profile?: string | null;
  known_roles?: string[];
  household_context?: string | null;
  /** Verbatim phrase the user stated; never inferred. Empty means deleted. */
  cultural_context?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface GiftSuggestion {
  id: string;
  recipient_id: string;
  title: string;
  description?: string;
  price?: number;
  link?: string;
  image_url?: string;
  generated_at: string;
  occasion_id?: string;
  /** Holds one of the recipient's three active slots, replayed from the
   * generate/remove timeline by `fetchGiftSuggestions` (DEV-488). Banding is
   * per scope: the newest three overall are not the newest three within a
   * single occasion, and the two views partition independently. */
  active_in_recipient: boolean;
  active_in_occasion: boolean;
  /** Most slots the scope ever held at once. The shortfall against the active
   * rows is the gap a removal left, which is what the backfill generates
   * against — a scope that never reached three has no gap. */
  peak_in_recipient: number;
  peak_in_occasion: number;
  /** The scope's gap is older than any backfill could take to fill it, so its
   * pending slots have stopped rather than still generating. */
  backfill_stalled_in_recipient: boolean;
  backfill_stalled_in_occasion: boolean;
}
