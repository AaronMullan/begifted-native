// ============================================================================
// Shared Types for Supabase Edge Functions
// ============================================================================

// ----------------------------------------------------------------------------
// Message Types (for conversations)
// ----------------------------------------------------------------------------

export interface Message {
  role: "user" | "assistant";
  content: string;
}

// ----------------------------------------------------------------------------
// Conversation Types
// ----------------------------------------------------------------------------

export type ConversationType =
  | "add_recipient" // Full extraction for new recipient
  | "add_occasion" // Extract occasion type + date from conversation
  | "update_field" // Partial extraction for specific field(s)
  | "extract_interests" // Extract interests from conversation
  | "extract_preferences" // Extract gift preferences from conversation
  | "extract_birthday" // Extract birthday from conversation
  | "extract_address"; // Extract address from conversation

// ----------------------------------------------------------------------------
// Recipient Data Types
// ----------------------------------------------------------------------------

export interface ExtractedData {
  name?: string;
  relationship_type?: string;
  interests?: string[];
  // Interests the user wants dropped in an update conversation. Reconciled
  // against the recipient's existing interests on the client (DEV-119).
  interests_removed?: string[];
  // Things the giver says the recipient already has, and things not to give.
  // Saved to recipients.avoid_list, which generation reads as hard blocks.
  already_owns?: string[];
  avoid?: string[];
  birthday?: string;
  age?: number | null;
  knownRoles?: string[];
  householdContext?: string;
  importantDates?: string[];
  knownOccasions?: string[];
  culturalContext?: string;
  // Stored synthesized recipient profile (existing recipients only). Fed into
  // occasion recommendations as the richer recipient-profile lens (DEV-155).
  synthesized_profile?: string;
  emotional_tone_preference?: string;
  gift_budget_min?: number;
  gift_budget_max?: number;
  /** The user said there is no upper limit. Never true alongside a max. */
  gift_budget_no_ceiling?: boolean;
  address?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  occasions?: {
    /** null when the conversation gave no date and the type isn't a known holiday. */
    date: string | null;
    occasion_type: string;
  }[];
  // For partial extractions, only include requested fields
  [key: string]: any;
}

export interface RecipientData {
  id?: string;
  name?: string;
  relationship_type?: string;
  interests?: string[];
  birthday?: string;
  knownRoles?: string[];
  householdContext?: string;
  importantDates?: string[];
  knownOccasions?: string[];
  culturalContext?: string;
  // Stored synthesized recipient profile, fed into occasion recommendations as
  // the richer recipient-profile lens (DEV-155).
  synthesized_profile?: string;
  emotional_tone_preference?: string;
  gift_budget_min?: number;
  gift_budget_max?: number;
  address?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  [key: string]: any;
}

// ----------------------------------------------------------------------------
// Readiness State Types
// ----------------------------------------------------------------------------

export type ReadinessState =
  | "not_captured"
  | "captured_needs_both"
  | "captured_needs_occasion"
  | "captured_needs_timing"
  | "captured_needs_price"
  | "captured_needs_age"
  | "captured_needs_specificity"
  | "ready";

export interface Readiness {
  state: ReadinessState;
  gift_ready: boolean;
  has_recipient_anchor: boolean;
  has_occasion_anchor: boolean;
  has_timing_anchor: boolean;
  has_price_anchor: boolean;
  has_age_anchor: boolean;
  has_specificity_anchor: boolean;
  missing_requirements: string[];
  reason: string;
}

// ----------------------------------------------------------------------------
// Context Info Types (for conversation analysis)
// ----------------------------------------------------------------------------

export interface ContextInfo {
  name?: string | null;
  relationship?: string | null;
  interests?: string[];
  birthday?: string | null;
  occasions_mentioned?: string[];
  needs_occasion_date?: boolean;
  occasion_needing_date?: string | null;
  occasions_needing_dates?: string[];
  has_price_guidance?: boolean;
  price_guidance_raw?: string | null;
  has_age_context?: boolean;
  age_context_raw?: string | null;
  // True when the recipient reads as a child/minor. Gates the age requirement:
  // a child must have an age or birthday before completion (so suggestions don't
  // skew old); for non-children age stays optional.
  recipient_is_child?: boolean;
  has_distinguishing_texture?: boolean;
  // Per-turn signal: the user's most recent message contributed distinguishing
  // texture. Gates whether the ready turn acknowledges the final answer before
  // completing; distinct from the cumulative has_distinguishing_texture.
  final_answer_added_texture?: boolean;
  specificity_followup_used?: boolean;
  // Mechanical count of sharpening texture follow-ups the assistant has already
  // asked (excludes the initial open-ended "what are they like?"). Enforces the
  // one-follow-up cap deterministically: >= 1 means the option is spent, so a
  // vague follow-up answer can't be re-probed on a new topic.
  specificity_followup_questions_asked?: number;
  // Per-turn signal: the assistant's single most recent message was a sharpening
  // texture follow-up (not the initial open-ended ask). This is the reliable
  // classification the runtime uses to spend the one allowed follow-up — once
  // true, texture completes regardless of how the user answered, so a vague
  // reply can't reopen enrichment and re-probe a new topic (food → music).
  last_assistant_asked_specificity_followup?: boolean;
  user_skipped_specificity?: boolean;
  other_details?: string;
  readiness?: Readiness;
  existing_name?: string | null;
  existing_relationship?: string | null;
  existing_interests?: string[];
  existing_birthday?: string | null;
  existing_emotional_tone_preference?: string | null;
  existing_gift_budget_min?: number | null;
  existing_gift_budget_max?: number | null;
  is_update?: boolean;
  conversation_length?: number;
  readiness_score?: number;
}

// ----------------------------------------------------------------------------
// Conversation Function Types (recipient-conversation)
// ----------------------------------------------------------------------------

export interface ConversationRequest {
  action: "conversation" | "extract";
  conversationType: ConversationType;
  messages: Message[];
  targetFields?: string[]; // Fields to extract (e.g., ["interests", "gift_budget_min"])
  existingData?: RecipientData; // Current recipient data for context in updates
}

export interface ConversationResponse {
  reply: string;
  shouldShowNextStepButton: boolean;
  conversationContext?: any;
  resolvedSystemPrompt?: string | null;
  // Server-side wall time per stage of this turn, in ms. Surfaced so the
  // playground and client logs can attribute a slow turn to a stage without a
  // log-stream lookup.
  timings?: Record<string, number>;
}

export interface ExtractionResponse {
  extractedData: ExtractedData;
  confidence_score?: number;
}

export type ConversationFunctionResponse =
  ConversationResponse | ExtractionResponse;
