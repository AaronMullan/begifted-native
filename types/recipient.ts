

export interface Recipient {
  id: string;
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
  created_at: string;
  updated_at?: string;
}
