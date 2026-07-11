export interface Recipient {
  id: string;
  user_id?: string;
  name: string;
  relationship_type: string;
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
  aesthetic?: string[];
  avoid_list?: string[];
  conversation_summary?: string | null;
  summary_approved?: boolean;
  fallback_days_before?: number;
  photo_url?: string;
  synthesized_profile?: string | null;
  known_roles?: string[];
  household_context?: string | null;
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
}
