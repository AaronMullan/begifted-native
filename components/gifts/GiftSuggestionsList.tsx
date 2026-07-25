import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import type { GiftSuggestion } from "../../types/recipient";
import PrimaryGiftCard from "./PrimaryGiftCard";
import CollapsedGiftCard from "./CollapsedGiftCard";
import { partitionSuggestions } from "./partition";

type GiftSuggestionsListProps = {
  suggestions: GiftSuggestion[];
  /** Recipient first name, used in the empty state copy. */
  recipientName: string;
  loading?: boolean;
  isGenerating?: boolean;
  /** When set, only suggestions for this occasion are shown, and gift
   * feedback is attributed to it. */
  occasionId?: string | null;
  /** Clears the occasion filter to reveal every suggestion. */
  onClearOccasionFilter?: () => void;
  /** Scrolls a freshly-expanded card's root node to a predictable spot below
   * the header. Wired up by the host screen that owns the ScrollView (DEV-185). */
  onScrollCardIntoView?: (node: View | null) => void;
};

const GiftSuggestionsList: React.FC<GiftSuggestionsListProps> = ({
  suggestions,
  recipientName,
  loading = false,
  isGenerating = false,
  occasionId = null,
  onClearOccasionFilter,
  onScrollCardIntoView,
}) => {
  // `undefined` = default (feature the newest active suggestion); `null` = user
  // collapsed everything; a string = a specific featured suggestion. A single
  // accordion state spans both the active and Past Gifts cards: only one card is
  // open at a time and it expands in place — never reordered to the top.
  const [expandedId, setExpandedId] = useState<string | null | undefined>(
    undefined
  );

  // True only between a user tapping a card and that card reporting its layout,
  // so we scroll on explicit taps but never on the default initial expansion.
  const scrollOnNextExpand = useRef(false);

  const handleExpand = (id: string) => {
    scrollOnNextExpand.current = true;
    setExpandedId(id);
  };
  const handleCollapse = () => setExpandedId(null);

  const handleExpandLayout = (node: View | null) => {
    if (!scrollOnNextExpand.current) return;
    scrollOnNextExpand.current = false;
    onScrollCardIntoView?.(node);
  };

  // The active recommendation cards; the "Past Gifts" remainder is rendered
  // separately by PastGiftsSection, placed after this list by the host.
  const { visible: visibleSuggestions, active: activeSuggestions } =
    partitionSuggestions(suggestions, occasionId);

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
        : (activeSuggestions[0]?.id ?? null);

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

  // The user always reaches a filtered list from a control that already named
  // the occasion (notification tap, occasion card), so the filter surfaces only
  // the affordance to clear it — a repeated title reads as tappable but isn't.
  const occasionHeader =
    occasionId && onClearOccasionFilter ? (
      <View style={styles.occasionHeader}>
        <Pressable onPress={onClearOccasionFilter} hitSlop={6}>
          <Text style={styles.viewAllLink}>View all gifts ›</Text>
        </Pressable>
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

  const renderCard = (suggestion: GiftSuggestion) =>
    suggestion.id === activeId ? (
      <PrimaryGiftCard
        key={suggestion.id}
        suggestion={suggestion}
        occasionId={occasionId}
        onCollapse={handleCollapse}
        onExpandLayout={handleExpandLayout}
      />
    ) : (
      <CollapsedGiftCard
        key={suggestion.id}
        suggestion={suggestion}
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
        {activeSuggestions.map((s) => renderCard(s))}
      </View>
    </View>
  );
};

export default GiftSuggestionsList;

const styles = StyleSheet.create({
  list: {
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
    alignItems: "flex-end",
    marginBottom: 16,
  },
  viewAllLink: {
    ...Typography.largeCta,
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
