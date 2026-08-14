import { useQuery } from "@tanstack/react-query";
import { invokeWithRetry } from "../lib/edge-retry";
import { queryKeys } from "../lib/query-keys";
import { getNextOccurrence } from "../utils/occasion-dates";
import type { Recipient } from "../types/recipient";
import {
  slugifyOccasionName,
  type OccasionRecommendations,
} from "./use-occasion-recommendations";

// A day, matching the persisted cache's maxAge: at most one AI call per
// recipient per day, and a restart within that window serves from disk.
const SUGGESTIONS_STALE_MS = 24 * 60 * 60 * 1000;

export interface InterestMomentSuggestions {
  /** Occasion names to render as recommended chips, e.g. "Record Store Day". */
  names: string[];
  /** slugified name → server-resolved future ISO date, for date capture. */
  dateBySlug: Record<string, string>;
}

const EMPTY: InterestMomentSuggestions = { names: [], dateBySlug: {} };

/**
 * Interest-derived occasion suggestions for the Add a Moment drawer: the
 * anchor-constrained discovery output of the recommend_occasions edge action
 * (server-validated names with real future dates), cached per recipient.
 * The deterministic relationship-gated chips (utils/recommended-moments.ts)
 * stay client-side; this adds the AI half on top.
 *
 * Pass `existingOccasions` as undefined while the occasions query is still
 * loading: the server derives its don't-re-suggest list from this array, so
 * firing with a premature [] would burn the capped discovery slots on
 * occasions the person already has — and cache that degraded result for a
 * day. `requested` gates the call on actual add-a-moment intent so browsing
 * recipient profiles doesn't spend AI calls.
 */
export function useInterestMomentSuggestions(
  recipient: Recipient | null | undefined,
  existingOccasions:
    { occasion_type: string; date: string | null }[] | undefined,
  requested: boolean = true
): InterestMomentSuggestions {
  // Discovery anchors are matched against interests / the synthesized
  // profile; without either signal the call can only return noise, so
  // don't spend an AI call on it.
  const hasSignal =
    !!recipient &&
    ((recipient.interests?.length ?? 0) > 0 || !!recipient.synthesized_profile);

  const { data } = useQuery({
    queryKey: queryKeys.momentSuggestions(recipient?.id ?? "none"),
    enabled: hasSignal && requested && existingOccasions !== undefined,
    staleTime: SUGGESTIONS_STALE_MS,
    gcTime: SUGGESTIONS_STALE_MS,
    // invokeWithRetry already retries transient failures with backoff;
    // stacking TanStack's default 3 retries on top would mean up to 12
    // invocations per persistent outage.
    retry: false,
    queryFn: async (): Promise<InterestMomentSuggestions> => {
      const { data: response, error } =
        await invokeWithRetry<OccasionRecommendations>(
          "recipient-conversation",
          {
            body: {
              action: "recommend_occasions",
              extractedData: {
                name: recipient!.name,
                relationship_type: recipient!.relationship_type ?? "",
                birthday: recipient!.birthday ?? null,
                interests: recipient!.interests ?? [],
                knownRoles: recipient!.known_roles ?? [],
                householdContext: recipient!.household_context ?? "",
                occasions: (existingOccasions ?? []).map((o) => ({
                  occasion_type: o.occasion_type,
                  date: o.date,
                })),
                importantDates: [],
                knownOccasions: [],
                culturalContext: "",
                synthesized_profile: recipient!.synthesized_profile ?? "",
              },
            },
          }
        );
      // Throw instead of caching an empty result: a transient failure must
      // not suppress suggestions for the full staleTime window. The global
      // QueryCache onError reports it to Sentry.
      if (error) throw error;
      const discovery = response?.discoverySuggestions ?? [];
      return {
        names: discovery.map((s) => s.name),
        dateBySlug: Object.fromEntries(
          discovery.map((s) => [slugifyOccasionName(s.name), s.suggestedDate])
        ),
      };
    },
  });

  if (!data) return EMPTY;
  return {
    names: data.names,
    // Roll forward at read time, not in queryFn: a suggestion fetched on
    // the occasion's own day is served from cache into tomorrow, where the
    // stored date would save a past occasion.
    dateBySlug: Object.fromEntries(
      Object.entries(data.dateBySlug).map(([slug, date]) => [
        slug,
        getNextOccurrence(date),
      ])
    ),
  };
}
