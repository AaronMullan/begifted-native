import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { ExtractedData } from "./use-conversation-flow";
import { lookupOccasionDate } from "../utils/occasion-dates";

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
  Partial<ExtractedData>;

/**
 * Fetch AI-driven occasion recommendations that lean into the recipient's
 * interests (e.g. running → race day, music → Record Store Day).
 *
 * Requires the recipient-conversation Edge Function to be deployed with
 * the recommend_occasions action. If the function returns non-2xx, we
 * fall back to birthday + common holidays and log a warning.
 */
export function useOccasionRecommendations(extractedData: OccasionRecommendationsInput | null) {
  const [recommendations, setRecommendations] = useState<OccasionRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!extractedData?.name || !extractedData?.relationship_type) {
      setRecommendations(null);
      return;
    }

    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("recipient-conversation", {
          body: {
            action: "recommend_occasions",
            extractedData: {
              name: extractedData.name,
              relationship_type: extractedData.relationship_type,
              birthday: extractedData.birthday ?? null,
              interests: extractedData.interests ?? [],
            },
          },
        });

        if (error) {
          if (typeof (error as any).context?.json === "function") {
            try {
              const body = await (error as any).context.json();
              console.warn(
                "[occasion-recommendations] Edge Function non-2xx:",
                (error as any).context?.status,
                body
              );
            } catch {
              console.warn("[occasion-recommendations] Edge Function error:", error);
            }
          } else {
            console.warn("[occasion-recommendations] Edge Function error:", error);
          }
          setRecommendations(getFallbackRecommendations(extractedData.birthday ?? null));
          return;
        }
        if (data && typeof data === "object" && Array.isArray(data.primaryOccasions)) {
          setRecommendations(data as OccasionRecommendations);
        } else {
          setRecommendations(getFallbackRecommendations(extractedData.birthday ?? null));
        }
      } catch (err) {
        console.warn("Error fetching occasion recommendations (using fallback):", err);
        setRecommendations(getFallbackRecommendations(extractedData.birthday ?? null));
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
  ]);

  return { recommendations, isLoading };
}

function getFallbackRecommendations(birthday: string | null): OccasionRecommendations {
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
  if (!birthday) return false;
  const birthDate = new Date(birthday);
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthDate.getFullYear();
  return age > 0 && age % 10 === 0 && age >= 30;
}

/**
 * Map AI occasion recommendations into the shape used by OccasionsSelectionView:
 * { date: string, occasion_type: string, enabled: boolean }.
 * Uses suggestedDate when present, otherwise lookupOccasionDate(type).
 */
export function mapRecommendationsToOccasions(
  recs: OccasionRecommendations | null
): Array<{ date: string; occasion_type: string; enabled: boolean }> {
  if (!recs?.primaryOccasions?.length) return [];

  return recs.primaryOccasions.map((o) => {
    const date =
      o.suggestedDate && isValidDate(o.suggestedDate)
        ? o.suggestedDate
        : lookupOccasionDate(o.type) ?? "2025-01-01";
    return {
      date,
      occasion_type: o.type || "custom",
      enabled: true,
    };
  });
}

function isValidDate(s: string): boolean {
  const d = new Date(s);
  return !Number.isNaN(d.getTime()) && s.length >= 10;
}
