/**
 * Query keys factory for TanStack Query
 * Centralizes all query keys to ensure consistent cache invalidation
 */

export const queryKeys = {
  // Auth
  auth: ["auth"] as const,

  // Profile
  profile: (userId: string) => ["profile", userId] as const,

  // Recipients
  recipients: (userId: string) => ["recipients", userId] as const,
  recipient: (userId: string, recipientId: string) =>
    ["recipients", userId, "detail", recipientId] as const,

  // Occasions
  occasions: (userId: string) => ["occasions", userId] as const,

  // Gift Suggestions
  giftSuggestions: (recipientId: string) =>
    ["giftSuggestions", recipientId] as const,

  // Notifications
  notifications: (userId: string) => ["notifications", userId] as const,
  unreadNotificationCount: (userId: string) =>
    ["notifications", userId, "unreadCount"] as const,

  // User Preferences
  userPreferences: (userId: string) => ["userPreferences", userId] as const,

  // FAQ (from Google Sheet or fallback)
  faqs: () => ["faqs"] as const,

  // Admin — Prompt Playground
  promptTestRuns: (userId: string, promptKey?: string) =>
    ["promptTestRuns", userId, promptKey ?? "all"] as const,
  activeSystemPrompt: (promptKey: string) =>
    ["systemPrompt", promptKey, "active"] as const,
  promptVersionHistory: (promptKey: string) =>
    ["systemPrompt", promptKey, "history"] as const,
  allProfiles: () => ["allProfiles"] as const,
  recipientsForUser: (userId: string) =>
    ["recipientsForUser", userId] as const,
};
