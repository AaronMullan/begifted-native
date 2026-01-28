export interface PreferenceOption {
  value: string;
  label: string;
  description: string;
}

export const PHILOSOPHY_OPTIONS: PreferenceOption[] = [
  {
    value: "thoughtful",
    label: "Thoughtful",
    description: "Focus on meaningful, personal gifts that show you care",
  },
  {
    value: "practical",
    label: "Practical",
    description: "Prioritize useful items that recipients will actually use",
  },
  {
    value: "luxury",
    label: "Luxury",
    description: "Choose high-end, premium gifts that make a statement",
  },
  {
    value: "experiential",
    label: "Experiential",
    description: "Prefer experiences and memories over physical items",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Mix of thoughtful, practical, and special items",
  },
];

export const TONE_OPTIONS: PreferenceOption[] = [
  {
    value: "warm",
    label: "Warm",
    description: "Friendly, affectionate, and heartfelt",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Polite, appropriate, and business-appropriate",
  },
  {
    value: "playful",
    label: "Playful",
    description: "Fun, lighthearted, and humorous",
  },
  {
    value: "romantic",
    label: "Romantic",
    description: "Intimate, passionate, and sentimental",
  },
  {
    value: "casual",
    label: "Casual",
    description: "Relaxed, easygoing, and informal",
  },
];

export const CREATIVITY_OPTIONS: PreferenceOption[] = [
  {
    value: "traditional",
    label: "Traditional",
    description: "Stick to classic, time-tested gift ideas",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Mix of traditional and unique options",
  },
  {
    value: "creative",
    label: "Creative",
    description: "Explore unique, unconventional gift ideas",
  },
  {
    value: "very_creative",
    label: "Very Creative",
    description: "Prioritize one-of-a-kind, highly original gifts",
  },
];

export const BUDGET_OPTIONS: PreferenceOption[] = [
  {
    value: "budget_conscious",
    label: "Budget Conscious",
    description: "Focus on value and finding great deals",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Balance quality and price",
  },
  {
    value: "premium",
    label: "Premium",
    description: "Willing to invest in higher-quality items",
  },
  {
    value: "flexible",
    label: "Flexible",
    description: "Adapt budget based on occasion and recipient",
  },
];

export const PLANNING_OPTIONS: PreferenceOption[] = [
  {
    value: "early_bird",
    label: "Early Bird",
    description: "Plan and purchase gifts well in advance",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Plan a few weeks ahead",
  },
  {
    value: "last_minute",
    label: "Last Minute",
    description: "Prefer quick decisions and fast shipping",
  },
  {
    value: "flexible",
    label: "Flexible",
    description: "Adapt planning style based on the occasion",
  },
];

export const REMINDER_OPTIONS = [
  { value: "14", label: "2 weeks before" },
  { value: "7", label: "1 week before" },
  { value: "3", label: "3 days before" },
  { value: "1", label: "1 day before" },
  { value: "0", label: "Day of event" },
];
