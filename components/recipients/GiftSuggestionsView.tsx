import React, { useState, useEffect } from "react";
import { StyleSheet, View, Linking, Image, Pressable } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import type { GiftSuggestion } from "../../types/recipient";

type GiftSuggestionsViewProps = {
  suggestions: GiftSuggestion[];
  loading: boolean;
  recipientName: string;
  isGenerating?: boolean;
  /** When set, only suggestions for this occasion are shown. */
  occasionIdFilter?: string | null;
  /** Human-readable label for the filtered occasion, e.g. "Christmas · Dec 25". */
  occasionLabel?: string;
  /** Clears the occasion filter to reveal every suggestion. */
  onClearOccasionFilter?: () => void;
};

const formatPrice = (price?: number) => {
  if (!price) return "Price not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
};

const openLink = (link?: string) => {
  if (link) {
    Linking.openURL(link);
  }
};

const MIN_IMAGE_SIZE = 200;

type SuggestionCardProps = {
  suggestion: GiftSuggestion;
  expanded: boolean;
  onToggle: () => void;
};

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  expanded,
  onToggle,
}) => {
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    if (!suggestion.image_url) return;
    Image.getSize(
      suggestion.image_url,
      (width, height) => {
        setShowImage(width >= MIN_IMAGE_SIZE && height >= MIN_IMAGE_SIZE);
      },
      () => setShowImage(false)
    );
  }, [suggestion.image_url]);

  if (!expanded) {
    return (
      <Pressable style={styles.cardCollapsed} onPress={onToggle}>
        <Text style={styles.titleCollapsed} numberOfLines={1}>
          {suggestion.title}
        </Text>
        <MaterialIcons
          name="keyboard-arrow-down"
          size={24}
          color={Colors.blues.dark}
        />
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.overflowButton}
        accessibilityRole="button"
        accessibilityLabel="More options"
        hitSlop={8}
      >
        <MaterialIcons name="more-horiz" size={22} color={Colors.blues.dark} />
      </Pressable>

      {showImage && suggestion.image_url && (
        <View style={styles.imagePanel}>
          <Image
            source={{ uri: suggestion.image_url }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      )}

      <View style={styles.cardContent}>
        <Pressable onPress={onToggle}>
          <Text style={styles.title}>{suggestion.title}</Text>
        </Pressable>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(suggestion.price)}</Text>
          {suggestion.link && (
            <Pressable onPress={() => openLink(suggestion.link)} hitSlop={6}>
              <Text style={styles.viewLink}>View Product ›</Text>
            </Pressable>
          )}
        </View>

        {suggestion.description && (
          <>
            <Text style={styles.whyLabel}>Why this fits</Text>
            <Text style={styles.whyBody}>{suggestion.description}</Text>
          </>
        )}
      </View>
    </View>
  );
};

export const GiftSuggestionsView: React.FC<GiftSuggestionsViewProps> = ({
  suggestions,
  loading,
  recipientName,
  isGenerating = false,
  occasionIdFilter = null,
  occasionLabel,
  onClearOccasionFilter,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleSuggestions = occasionIdFilter
    ? suggestions.filter((s) => s.occasion_id === occasionIdFilter)
    : suggestions;

  const latestId = visibleSuggestions[0]?.id ?? null;
  const activeExpandedId = expandedId ?? latestId;

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading gift suggestions...
        </Text>
      </View>
    );
  }

  const occasionHeader =
    occasionIdFilter && occasionLabel ? (
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
      <View style={styles.container}>
        {occasionHeader}
        <View style={styles.emptyContainer}>
          <MaterialIcons name="card-giftcard" size={64} color="#ccc" />
          <Text variant="titleLarge" style={styles.emptyTitle}>
            No Gift Ideas Yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {occasionIdFilter
              ? `No gift suggestions for this occasion yet.`
              : `Gift suggestions will appear here once they're generated for ${recipientName}.`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        {visibleSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            expanded={activeExpandedId === suggestion.id}
            onToggle={() => toggle(suggestion.id)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    overflow: "hidden",
    paddingBottom: 20,
  },
  overflowButton: {
    position: "absolute",
    top: 10,
    right: 12,
    zIndex: 2,
    padding: 4,
  },
  imagePanel: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F2F2F2",
    paddingTop: 28,
    paddingHorizontal: 32,
    paddingBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  title: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
    lineHeight: 26,
    color: Colors.blues.dark,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  price: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 17,
    color: Colors.blues.dark,
  },
  viewLink: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.yellows.amber,
  },
  whyLabel: {
    fontWeight: "700",
    fontSize: 13,
    color: Colors.blues.dark,
    marginBottom: 6,
  },
  whyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#3b3b3b",
  },
  cardCollapsed: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleCollapsed: {
    flex: 1,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    color: Colors.blues.dark,
    marginRight: 12,
  },
});
