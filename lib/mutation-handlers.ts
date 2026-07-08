import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { showSnackbar } from "../components/GlobalSnackbar";

type MutationHandlers<TData, TVariables> = {
  onSuccess: (data: TData, variables: TVariables) => void;
  onError: (error: unknown) => void;
};

/**
 * Shared onSuccess/onError for mutation hooks: invalidate the affected cache
 * keys and surface failures to the user via the global snackbar. Sentry
 * capture is not done here — the MutationCache hook in app/_layout.tsx
 * already reports every mutation error.
 */
export function makeMutationHandlers<TData, TVariables>(options: {
  queryClient: QueryClient;
  /** Hook name used in the console breadcrumb. */
  label: string;
  /** User-facing failure message shown in the snackbar. */
  errorMessage: string;
  /** Cache keys to invalidate after a successful write. */
  invalidateKeys?: (data: TData, variables: TVariables) => QueryKey[];
  /** Follow-on success work (e.g. background profile re-synthesis). */
  afterSuccess?: (data: TData, variables: TVariables) => void;
}): MutationHandlers<TData, TVariables> {
  const { queryClient, label, errorMessage, invalidateKeys, afterSuccess } =
    options;
  return {
    onSuccess: (data, variables) => {
      for (const queryKey of invalidateKeys?.(data, variables) ?? []) {
        queryClient.invalidateQueries({ queryKey });
      }
      afterSuccess?.(data, variables);
    },
    onError: (error) => {
      console.error(`${label} failed:`, error);
      const isNetworkError =
        error instanceof Error && /network request failed/i.test(error.message);
      showSnackbar(
        isNetworkError
          ? "Network request failed. Check your internet connection and try again."
          : errorMessage
      );
    },
  };
}
