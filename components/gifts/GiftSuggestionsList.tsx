import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import type { GiftSuggestion } from "../../types/recipient";
import PrimaryGiftCard from "./PrimaryGiftCard";
import CollapsedGiftCard from "./CollapsedGiftCard";

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
  /** Fired when a collapsed suggestion is expanded (hoisted to the top), so the
   * host can scroll its view back up to reveal the newly featured card. */
  onExpand?: () => void;
};

const GiftSuggestionsList: React.FC<GiftSuggestionsListProps> = ({
  suggestions,
  recipientName,
  loading = false,
  isGenerating = false,
  occasionId = null,
  occasionLabel,
  onClearOccasionFilter,
  onExpand,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleExpand = (id: string) => {
    setExpandedId(id);
    onExpand?.();
  };

  const visibleSuggestions = occasionId
    ? suggestions.filter((s) => s.occasion_id === occasionId)
    : suggestions;

  const activeId = expandedId ?? visibleSuggestions[0]?.id ?? null;
  const primary = visibleSuggestions.find((s) => s.id === activeId);
  const rest = visibleSuggestions.filter((s) => s.id !== activeId);

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
        {primary && (
          <PrimaryGiftCard suggestion={primary} occasionId={occasionId} />
        )}
        {rest.map((s) => (
          <CollapsedGiftCard
            key={s.id}
            suggestion={s}
            occasionId={occasionId}
            onPress={() => handleExpand(s.id)}
          />
        ))}
      </View>
    </View>
  );
};

export default GiftSuggestionsList;

const styles = StyleSheet.create({
  list: {
    gap: 12,
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
