import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";
import type { GiftSuggestion } from "../../types/recipient";
import PrimaryGiftCard from "./PrimaryGiftCard";
import CollapsedGiftCard from "./CollapsedGiftCard";
import ExpandCircleIcon from "../ExpandCircleIcon";

/** How many of the newest suggestions show as active recommendation cards.
 * Anything older falls into the collapsed "Past Gifts" section (DEV-165). */
const ACTIVE_COUNT = 3;

/** Horizontal padding inside gift cards (CollapsedGiftCard/PrimaryGiftCard).
 * Used to align the Past Gifts header with card content. */
const CARD_INNER_PADDING = 20;

type GiftSuggestionsListProps = {
  suggestions: GiftSuggestion[];
  /** Recipient first name, used in the empty state copy. */
  recipientName: string;
  loading?: boolean;
  isGenerating?: boolean;
  /** When set, only suggestions for this occasion are shown, and gift
   * feedback is attributed to it. */
  occasionId?: string | null;
  /** Human-readable label for the filtered occasion, e.g. "Christmas · Dec 25". */
  occasionLabel?: string;
  /** Clears the occasion filter to reveal every suggestion. */
  onClearOccasionFilter?: () => void;
};

const GiftSuggestionsList: React.FC<GiftSuggestionsListProps> = ({
  suggestions,
  recipientName,
  loading = false,
  isGenerating = false,
  occasionId = null,
  occasionLabel,
  onClearOccasionFilter,
}) => {
  // `undefined` = default (feature the newest active suggestion); `null` = user
  // collapsed everything; a string = a specific featured suggestion. A single
  // accordion state spans both the active and Past Gifts cards: only one card is
  // open at a time and it expands in place — never reordered to the top.
  const [expandedId, setExpandedId] = useState<string | null | undefined>(
    undefined
  );
  const [pastExpanded, setPastExpanded] = useState(false);

  const handleExpand = (id: string) => setExpandedId(id);
  const handleCollapse = () => setExpandedId(null);

  const visibleSuggestions = occasionId
    ? suggestions.filter((s) => s.occasion_id === occasionId)
    : suggestions;

  // Suggestions arrive newest-first (api orders by generated_at desc). The newest
  // three are the active recommendations; the remainder are "Past Gifts".
  const activeSuggestions = visibleSuggestions.slice(0, ACTIVE_COUNT);
  const pastSuggestions = visibleSuggestions.slice(ACTIVE_COUNT);

  // If the currently open gift was just removed (or filtered out of view), the
  // stale `expandedId` would match no card and collapse the page to a list-only
  // dead state. Fall back to the first active recommendation so one gift always
  // stays open in display mode while valid recommendations remain (DEV-167). An
  // explicit user collapse (`null`) is still respected.
  const expandedStillVisible =
    typeof expandedId === "string" &&
    visibleSuggestions.some((s) => s.id === expandedId);

  const activeId =
    expandedId === null
      ? null
      : expandedStillVisible
      ? expandedId
      : activeSuggestions[0]?.id ?? null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.blues.dark} />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading gift suggestions...
        </Text>
      </View>
    );
  }

  const occasionHeader =
    occasionId && occasionLabel ? (
      <View style={styles.occasionHeader}>
        <View style={styles.occasionHeaderText}>
          <Text style={styles.occasionHeaderLabel}>Showing gifts for</Text>
          <Text style={styles.occasionHeaderValue}>{occasionLabel}</Text>
        </View>
        {onClearOccasionFilter && (
          <Pressable onPress={onClearOccasionFilter} hitSlop={6}>
            <Text style={styles.viewAllLink}>View all gifts ›</Text>
          </Pressable>
        )}
      </View>
    ) : null;

  if (visibleSuggestions.length === 0 && !isGenerating) {
    return (
      <View>
        {occasionHeader}
        <View style={styles.emptyContainer}>
          <MaterialIcons name="card-giftcard" size={64} color="#ccc" />
          <Text variant="titleLarge" style={styles.emptyTitle}>
            No Gift Ideas Yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {occasionId
              ? "No gift suggestions for this occasion yet."
              : `Gift suggestions will appear here once they're generated for ${
                  recipientName || "this recipient"
                }.`}
          </Text>
        </View>
      </View>
    );
  }

  const renderCard = (suggestion: GiftSuggestion, outlined: boolean) =>
    suggestion.id === activeId ? (
      <PrimaryGiftCard
        key={suggestion.id}
        suggestion={suggestion}
        occasionId={occasionId}
        onCollapse={handleCollapse}
      />
    ) : (
      <CollapsedGiftCard
        key={suggestion.id}
        suggestion={suggestion}
        outlined={outlined}
        onPress={() => handleExpand(suggestion.id)}
      />
    );

  return (
    <View>
      {occasionHeader}
      {isGenerating && (
        <View style={styles.generatingContainer}>
          <ActivityIndicator size="small" />
          <Text variant="bodyMedium" style={styles.generatingText}>
            Generating gift suggestions...
          </Text>
        </View>
      )}

      <View style={styles.list}>
        {activeSuggestions.map((s) => renderCard(s, false))}
      </View>

      {pastSuggestions.length > 0 && (
        <View style={styles.pastZone}>
          <Pressable
            style={styles.pastHeaderRow}
            onPress={() => {
              if (
                pastExpanded &&
                typeof expandedId === "string" &&
                pastSuggestions.some((s) => s.id === expandedId)
              ) {
                setExpandedId(null);
              }
              setPastExpanded(!pastExpanded);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              pastExpanded
                ? "Collapse past gift recommendations"
                : "Expand past gift recommendations"
            }
          >
            <Text style={styles.pastHeader}>Past Gift Recommendations</Text>
            <ExpandCircleIcon
              direction={pastExpanded ? "up" : "down"}
              color={Colors.brand.mediumTeal}
              size={24}
            />
          </Pressable>
          {pastExpanded && (
            <View style={styles.pastList}>
              {pastSuggestions.map((s) => renderCard(s, false))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default GiftSuggestionsList;

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  pastZone: {
    marginTop: 48,
    // Full-bleed to the screen edge: cancel the host screen's gutter rather
    // than guessing a magic offset. Host scroll padding is Spacing.screenGutter.
    marginHorizontal: -Spacing.screenGutter,
    backgroundColor: Colors.brand.pastZone,
  },
  pastHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Align header text/chevron with card content: gutter + card inner padding.
    paddingHorizontal: Spacing.screenGutter + CARD_INNER_PADDING,
    paddingVertical: 19,
  },
  pastHeader: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
    flex: 1,
  },
  pastList: {
    // Re-inset past cards to the screen gutter so they line up with active cards.
    paddingHorizontal: Spacing.screenGutter,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  generatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 18,
    marginBottom: 16,
  },
  generatingText: {
    marginLeft: 12,
    color: "#666",
  },
  occasionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  occasionHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  occasionHeaderLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: Colors.blues.dark,
    opacity: 0.6,
    marginBottom: 2,
  },
  occasionHeaderValue: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    color: Colors.blues.dark,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.yellows.amber,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
});
