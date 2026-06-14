import {
  FunctionsFetchError,
  FunctionsHttpError,
  type FunctionInvokeOptions,
} from "@supabase/supabase-js";
import type { FunctionsResponse } from "@supabase/functions-js";
import { supabase } from "./supabase";
import { isBackgroundCancelledFetch } from "./sentry-helpers";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Jittered exponential backoff: ~400ms, ~800ms between attempts, plus up to
// 50% jitter so a fleet of clients hitting a recovering edge function don't
// retry in lockstep.
function backoffDelay(attempt: number): number {
  const base = BASE_DELAY_MS * 2 ** (attempt - 1);
  return base + Math.random() * base * 0.5;
}

// Only transient failures are worth re-sending:
// - FunctionsFetchError in the foreground — a real network blip. Background
//   cancels (iOS killing in-flight fetches on backgrounding) are benign and
//   excluded via isBackgroundCancelledFetch.
// - FunctionsHttpError with a 5xx status — the edge fn / upstream LLM threw or
//   timed out. A 4xx is a deterministic client error; retrying just stalls the
//   user, so we let it surface immediately.
function isRetryableInvokeError(error: unknown): boolean {
  if (error instanceof FunctionsFetchError) {
    return !isBackgroundCancelledFetch(error);
  }
  if (error instanceof FunctionsHttpError) {
    const status = (error.context as Response | undefined)?.status;
    return typeof status === "number" && status >= 500;
  }
  return false;
}

/**
 * Invoke a Supabase edge function with a small retry-with-backoff loop for
 * transient failures (foreground network blips and 5xx responses). Mirrors the
 * `{ data, error }` shape of `supabase.functions.invoke` so callers swap it in
 * directly. Non-transient errors (4xx, auth, background cancels) return on the
 * first attempt without retrying (DEV-134).
 */
export async function invokeWithRetry<T>(
  functionName: string,
  options: FunctionInvokeOptions,
  maxAttempts: number = MAX_ATTEMPTS
): Promise<FunctionsResponse<T>> {
  let result = await supabase.functions.invoke<T>(functionName, options);
  for (
    let attempt = 1;
    attempt < maxAttempts &&
    result.error &&
    isRetryableInvokeError(result.error);
    attempt++
  ) {
    await delay(backoffDelay(attempt));
    result = await supabase.functions.invoke<T>(functionName, options);
  }
  return result;
}
