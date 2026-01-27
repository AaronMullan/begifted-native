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

  // Dashboard
  dashboardStats: (userId: string) => ["dashboardStats", userId] as const,

  // Gift Suggestions
  giftSuggestions: (recipientId: string) =>
    ["giftSuggestions", recipientId] as const,
};
