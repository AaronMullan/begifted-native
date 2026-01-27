import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
// import { STALE_TIME_MS } from "../lib/query-defaults";
import { fetchFaqs } from "../lib/faq-sheet";

/**
 * Hook to fetch FAQs (from Google Sheet when configured, else built-in fallback)
 * TODO: re-enable cache — set staleTime: STALE_TIME_MS and remove staleTime/gcTime overrides
 */
export function useFaqs() {
  return useQuery({
    queryKey: queryKeys.faqs(),
    queryFn: fetchFaqs,
    staleTime: 0,
    gcTime: 0,
  });
}
