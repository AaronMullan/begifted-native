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
  birthday?: string;
  emotional_tone_preference?: string;
  gift_budget_min?: number;
  gift_budget_max?: number;
  address?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  occasions?: Array<{
    date: string;
    occasion_type: string;
  }>;
  // For partial extractions, only include requested fields
  [key: string]: any;
}

export interface RecipientData {
  id?: string;
  name?: string;
  relationship_type?: string;
  interests?: string[];
  birthday?: string;
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
// Context Info Types (for conversation analysis)
// ----------------------------------------------------------------------------

export interface ContextInfo {
  name?: string | null;
  relationship?: string | null;
  interests?: string[];
  birthday?: string | null;
  occasions_mentioned?: string[];
  other_details?: string;
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
}

export interface ExtractionResponse {
  extractedData: ExtractedData;
  confidence_score?: number;
}

export type ConversationFunctionResponse =
  | ConversationResponse
  | ExtractionResponse;

// ----------------------------------------------------------------------------
// Gift Suggestions Function Types (generate-gift-suggestions)
// ----------------------------------------------------------------------------

export interface GiftSuggestionRequest {
  recipientName: string;
  relationship: string;
  interests?: string[];
  giftingTone?: string;
  budget?: {
    min?: number;
    max?: number;
  };
  conversationSummary?: string;
  personalityTraits?: string[];
  lifestyleNotes?: string;
  recentEvents?: string;
  giftPreferences?: string;
  userId?: string;
}

export interface GiftItem {
  name: string;
  description: string;
  estimatedPrice: string;
  retailer: string;
  productUrl: string;
  sourceType: "thoughtful" | "practical" | "luxury" | "experiential";
  reasoning: string;
  perfectMatch?: string;
}

export interface GiftSuggestionResponse {
  primaryGift: GiftItem;
  alternatives: GiftItem[];
  note: string;
  contextUsed: boolean;
  personalizationLevel: "basic" | "medium" | "high";
}

export interface GiftItemWithASIN extends GiftItem {
  ASIN?: string;
}

export interface ParsedGiftSuggestions {
  primaryGift?: GiftItemWithASIN | null;
  alternatives?: GiftItemWithASIN[];
  note?: string;
  contextUsed?: boolean;
  personalizationLevel?: "basic" | "medium" | "high";
}

export type PhilosophyType =
  | "thoughtful"
  | "experiences"
  | "practical"
  | "surprise";
export type CreativityType = "classic" | "creative" | "innovative";
export type BudgetStyleType = "mindful" | "balanced" | "generous";
export type PlanningStyleType = "planner" | "seasonal" | "spontaneous";

// ----------------------------------------------------------------------------
// User Preferences Types
// ----------------------------------------------------------------------------

export interface UserPreferences {
  giftingTone?: string;
  philosophy?: string;
  creativity?: string;
  budgetStyle?: string;
  planningStyle?: string;
}

export interface UserStack {
  philosophy?: string;
  creativity?: string;
  budget_style?: string;
  planning_style?: string;
}

export interface UserData {
  default_gifting_tone?: string;
  user_stack?: UserStack;
  reminder_days?: number;
  auto_fallback_enabled?: boolean;
}
