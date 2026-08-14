import { useQuery } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { invokeWithRetry } from "../lib/edge-retry";
import { queryKeys } from "../lib/query-keys";
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
 */
export function useInterestMomentSuggestions(
  recipient: Recipient | null | undefined,
  existingOccasions: { occasion_type: string; date: string | null }[]
): InterestMomentSuggestions {
  // Discovery anchors are matched against interests / the synthesized
  // profile; without either signal the call can only return noise, so
  // don't spend an AI call on it.
  const hasSignal =
    !!recipient &&
    ((recipient.interests?.length ?? 0) > 0 || !!recipient.synthesized_profile);

  const { data } = useQuery({
    queryKey: queryKeys.momentSuggestions(recipient?.id ?? "none"),
    enabled: hasSignal,
    staleTime: SUGGESTIONS_STALE_MS,
    gcTime: SUGGESTIONS_STALE_MS,
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
                occasions: existingOccasions.map((o) => ({
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
      if (error) {
        Sentry.captureException(error, {
          tags: {
            edge_function: "recipient-conversation",
            action: "recommend_occasions",
          },
        });
        // Throw instead of caching an empty result: a transient failure
        // must not suppress suggestions for the full staleTime window.
        throw error;
      }
      const discovery = response?.discoverySuggestions ?? [];
      return {
        names: discovery.map((s) => s.name),
        dateBySlug: Object.fromEntries(
          discovery.map((s) => [slugifyOccasionName(s.name), s.suggestedDate])
        ),
      };
    },
  });

  return data ?? EMPTY;
}
