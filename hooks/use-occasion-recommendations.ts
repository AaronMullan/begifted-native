import { useState, useEffect } from "react";
import * as Sentry from "@sentry/react-native";
import { supabase } from "../lib/supabase";
import type { ExtractedData } from "./use-conversation-flow";
import { getNextOccurrence, lookupOccasionDate } from "../utils/occasion-dates";
import { parseBirthdayParts } from "../utils/birthday";

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const CATEGORY_TYPES = new Set([
  "major_gifting_holiday",
  "relationship_based_occasion",
  "interest_based_observance",
]);

function slugifyOccasionName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export interface OccasionRecommendation {
  type: string;
  name: string;
  suggestedDate: string | null;
  isMilestone: boolean;
  reasoning: string;
}

export interface OccasionRecommendations {
  primaryOccasions: OccasionRecommendation[];
  additionalSuggestions: string[];
}

/** Minimal shape needed for occasion recommendations */
export type OccasionRecommendationsInput = Pick<
  ExtractedData,
  "name" | "relationship_type" | "birthday" | "interests"
> &
  Partial<ExtractedData> & {
    knownRoles?: string[];
    householdContext?: string;
    importantDates?: string[];
    knownOccasions?: string[];
    culturalContext?: string;
  };

/**
 * Fetch AI-driven occasion recommendations that lean into the recipient's
 * interests (e.g. running → race day, music → Record Store Day).
 *
 * Requires the recipient-conversation Edge Function to be deployed with
 * the recommend_occasions action. If the function returns non-2xx, we
 * fall back to birthday + common holidays and log a warning.
 */
export function useOccasionRecommendations(
  extractedData: OccasionRecommendationsInput | null
) {
  const [recommendations, setRecommendations] =
    useState<OccasionRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!extractedData?.name || !extractedData?.relationship_type) {
      setRecommendations(null);
      return;
    }

    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "recipient-conversation",
          {
            body: {
              action: "recommend_occasions",
              extractedData: {
                name: extractedData.name,
                relationship_type: extractedData.relationship_type,
                birthday: extractedData.birthday ?? null,
                interests: extractedData.interests ?? [],
                knownRoles: extractedData.knownRoles ?? [],
                householdContext: extractedData.householdContext ?? "",
                // Already-captured occasions feed the prompt's
                // {{knownOccasions}} context (server derives the list).
                occasions: extractedData.occasions ?? [],
                importantDates: extractedData.importantDates ?? [],
                knownOccasions: extractedData.knownOccasions ?? [],
                culturalContext: extractedData.culturalContext ?? "",
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
          await logEdgeFunctionError(error);
          setRecommendations(
            getFallbackRecommendations(extractedData.birthday ?? null)
          );
          return;
        }
        if (
          data &&
          typeof data === "object" &&
          Array.isArray(data.primaryOccasions)
        ) {
          setRecommendations(data as OccasionRecommendations);
        } else {
          setRecommendations(
            getFallbackRecommendations(extractedData.birthday ?? null)
          );
        }
      } catch (err) {
        console.warn(
          "Error fetching occasion recommendations (using fallback):",
          err
        );
        Sentry.captureException(err, {
          tags: {
            edge_function: "recipient-conversation",
            action: "recommend_occasions",
          },
        });
        setRecommendations(
          getFallbackRecommendations(extractedData.birthday ?? null)
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [
    extractedData?.name,
    extractedData?.relationship_type,
    extractedData?.birthday ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    (extractedData?.interests ?? []).join(","),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    (extractedData?.knownRoles ?? []).join(","),
    extractedData?.householdContext ?? "",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    (extractedData?.occasions ?? [])
      .map((o) => `${o.occasion_type}:${o.date}`)
      .join(","),
  ]);

  return { recommendations, isLoading };
}

async function logEdgeFunctionError(error: unknown): Promise<void> {
  const httpError = error as { context?: Response };
  if (!httpError.context?.json) {
    console.warn("[occasion-recommendations] Edge Function error:", error);
    return;
  }
  try {
    const body = await httpError.context.json();
    console.warn(
      "[occasion-recommendations] Edge Function non-2xx:",
      httpError.context.status,
      body
    );
  } catch {
    console.warn("[occasion-recommendations] Edge Function error:", error);
  }
}

function getFallbackRecommendations(
  birthday: string | null
): OccasionRecommendations {
  const primaryOccasions: OccasionRecommendation[] = [];
  if (birthday) {
    primaryOccasions.push({
      type: "birthday",
      name: "Birthday",
      suggestedDate: birthday,
      isMilestone: checkIfMilestoneBirthday(birthday),
      reasoning: "Everyone deserves to feel special on their birthday.",
    });
  }
  return {
    primaryOccasions,
    additionalSuggestions: ["Christmas", "New Year", "Thanksgiving"],
  };
}

function checkIfMilestoneBirthday(birthday: string | null): boolean {
  const parts = parseBirthdayParts(birthday);
  if (!parts || parts.year === null) return false;
  const age = new Date().getFullYear() - parts.year;
  return age > 0 && age % 10 === 0 && age >= 30;
}

/**
 * Map AI occasion recommendations into the shape used by OccasionsSelectionView:
 * { date: string, occasion_type: string, enabled: boolean }.
 *
 * The active prompt uses category-level `type` values (e.g. "interest_based_observance")
 * and puts the specific holiday in `name`. So we derive occasion_type from a slugified
 * name (with fallback to the raw type), and prefer the AI's suggestedDate, falling back
 * to lookupOccasionDate keyed by the slugified name.
 */
export function mapRecommendationsToOccasions(
  recs: OccasionRecommendations | null
): { date: string; occasion_type: string; enabled: boolean }[] {
  if (!recs?.primaryOccasions?.length) return [];

  return recs.primaryOccasions
    .map((o) => {
      // Birthday is added from extractedData.birthday in OccasionsSelectionView.
      if (o.type === "birthday") return null;

      const nameSlug = o.name ? slugifyOccasionName(o.name) : "";
      const typeSlug = (o.type || "").toLowerCase();
      const occasionType =
        nameSlug ||
        (CATEGORY_TYPES.has(typeSlug) ? "custom" : typeSlug || "custom");

      const suggested = o.suggestedDate?.trim() ?? "";
      let date: string | null = null;
      if (ISO_DATE_ONLY.test(suggested)) {
        date = getNextOccurrence(suggested);
      } else if (nameSlug) {
        date = lookupOccasionDate(nameSlug);
      }
      if (!date && !CATEGORY_TYPES.has(typeSlug)) {
        date = lookupOccasionDate(typeSlug);
      }

      if (!date) return null;
      return { date, occasion_type: occasionType, enabled: true };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);
}
