/**
 * TanStack Query cache defaults
 * Use these so data stays fresh in memory and we don't refetch on every navigation.
 */

/** How long data is considered fresh; no refetch while fresh (mount, focus, etc.) */
export const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

/** How long unused data stays in cache before garbage collection */
export const GC_TIME_MS = 30 * 60 * 1000; // 30 minutes

/** Slightly shorter stale for data that can change more often (e.g. gift suggestions) */
export const STALE_TIME_SHORT_MS = 2 * 60 * 1000; // 2 minutes

export const defaultQueryOptions = {
  staleTime: STALE_TIME_MS,
  gcTime: GC_TIME_MS,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
} as const;
