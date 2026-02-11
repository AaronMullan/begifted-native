import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { STALE_TIME_MS, GC_TIME_MS } from "../lib/query-defaults";
import { fetchFaqs } from "../lib/faq-sheet";

/**
 * Hook to fetch FAQs (from Google Sheet when configured, else built-in fallback)
 * FAQs rarely change, so we cache for 5 minutes.
 */
export function useFaqs() {
  return useQuery({
    queryKey: queryKeys.faqs(),
    queryFn: fetchFaqs,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
