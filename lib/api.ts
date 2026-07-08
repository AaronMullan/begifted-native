/**
 * Supabase API layer, split by domain under lib/api/. This barrel re-exports
 * everything so existing `lib/api` imports keep working unchanged.
 */

export * from "./api/profiles";
export * from "./api/notifications";
export * from "./api/recipients";
export * from "./api/occasions";
export * from "./api/gifts";
export * from "./api/admin";
