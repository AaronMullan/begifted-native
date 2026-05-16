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

export function isOfflineError(err: Error): boolean {
  return err.message === "Network request failed";
}

// iOS cancels in-flight fetches when the app loses foreground, surfacing as
// FunctionsFetchError from supabase-js. Treat this as expected noise, not a bug.
export function isBackgroundCancelledFetch(err: unknown): boolean {
  if (AppState.currentState === "active") return false;
  return err instanceof Error && err.name === "FunctionsFetchError";
}

export function captureQueryError(
  error: unknown,
  queryKey: readonly unknown[],
): void {
  const err = toError(error);
  if (isOfflineError(err)) return;
  Sentry.captureException(err, {
    tags: { source: "react_query", kind: "query" },
    contexts: { query: { queryKey: JSON.stringify(queryKey) } },
    extra: error instanceof Error ? undefined : { original: error },
  });
}

export function captureMutationError(
  error: unknown,
  mutationKey: readonly unknown[] | undefined,
): void {
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
