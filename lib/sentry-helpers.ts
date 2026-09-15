import * as Sentry from "@sentry/react-native";
import { AppState } from "react-native";

export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  if (value && typeof value === "object") {
    const obj = value as { message?: unknown; name?: unknown };
    const message =
      typeof obj.message === "string" ? obj.message : "Unknown error";
    const err = new Error(message);
    if (typeof obj.name === "string") err.name = obj.name;
    return err;
  }
  return new Error(String(value));
}

// Offline / transient network failures surface in several string shapes:
// "Network request failed", "TypeError: Network request failed" (coerced
// Supabase PostgrestErrors), and "Network request timed out" (background
// pollers like unreadCount). Substring-match the common "Network request"
// stem so all variants are treated as expected offline noise, not bugs.
//
// Expo's fetch is the global `fetch` on native and prefixes every failure
// below the HTTP layer with "fetch failed:". That prefix alone is too broad:
// it also wraps TLS/ATS rejections, unresolvable hosts, redirect refusals, and
// unknown errors, which signal a broken release and must still reach Sentry.
// Match only the OS messages for a lost or absent connection. The native
// URLError code would be the sturdier signal, but Expo's bridge keeps only the
// localized description, so these strings are all JS ever sees. On a
// non-English device they won't match and get reported, which is the safe
// direction to fail.
const EXPO_FETCH_PREFIX = "fetch failed:";
const EXPO_OFFLINE_MESSAGES = [
  "The network connection was lost",
  "The request timed out",
  "The Internet connection appears to be offline",
  "Could not connect to the server",
];

function isExpoFetchOfflineError(message: string): boolean {
  return (
    message.includes(EXPO_FETCH_PREFIX) &&
    EXPO_OFFLINE_MESSAGES.some((m) => message.includes(m))
  );
}

export function isOfflineError(err: Error): boolean {
  return (
    err.message.includes("Network request") ||
    isExpoFetchOfflineError(err.message)
  );
}

// A stale access token surfaces as PGRST301 / "JWT expired" on a foregrounded
// PostgREST request. supabase-js self-heals via AppState auto-refresh
// (lib/supabase.ts), so the rejected in-flight request is benign — don't page
// Sentry for it.
function isSelfHealingAuthError(error: unknown, err: Error): boolean {
  if (/jwt expired/i.test(err.message)) return true;
  if (error && typeof error === "object") {
    return (error as { code?: unknown }).code === "PGRST301";
  }
  return false;
}

// Single suppression check for both query and mutation reporters. Catches the
// network/offline shapes (including PostgrestErrors that carry the underlying
// network message in `details`) and self-healing transient auth errors.
export function isExpectedTransientError(error: unknown): boolean {
  const err = toError(error);
  if (isOfflineError(err)) return true;
  if (isSelfHealingAuthError(error, err)) return true;
  if (error && typeof error === "object") {
    const details = (error as { details?: unknown }).details;
    if (typeof details === "string" && details.includes("Network request")) {
      return true;
    }
  }
  return false;
}

// iOS cancels in-flight fetches when the app loses foreground, surfacing as
// FunctionsFetchError from supabase-js. Treat this as expected noise, not a bug.
export function isBackgroundCancelledFetch(err: unknown): boolean {
  if (AppState.currentState === "active") return false;
  return err instanceof Error && err.name === "FunctionsFetchError";
}

export function captureQueryError(
  error: unknown,
  queryKey: readonly unknown[]
): void {
  if (isExpectedTransientError(error)) return;
  const err = toError(error);
  Sentry.captureException(err, {
    tags: { source: "react_query", kind: "query" },
    contexts: { query: { queryKey: JSON.stringify(queryKey) } },
    extra: error instanceof Error ? undefined : { original: error },
  });
}

export function captureMutationError(
  error: unknown,
  mutationKey: readonly unknown[] | undefined
): void {
  if (isExpectedTransientError(error)) return;
  // Re-adding an existing moment trips the occasions unique index by design;
  // the UI explains it, so it isn't a defect worth paging on. Name check
  // (not instanceof) keeps this file free of an api-layer import.
  if (toError(error).name === "DuplicateOccasionError") return;
  const err = toError(error);
  Sentry.captureException(err, {
    tags: { source: "react_query", kind: "mutation" },
    contexts: {
      mutation: {
        mutationKey: mutationKey ? JSON.stringify(mutationKey) : "unknown",
      },
    },
    extra: error instanceof Error ? undefined : { original: error },
  });
}
