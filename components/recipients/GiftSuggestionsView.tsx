import React from "react";
import { StyleSheet, View, Linking } from "react-native";
import { ActivityIndicator, Text, Button, Card } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import type { GiftSuggestion } from "../../types/recipient";

type GiftSuggestionsViewProps = {
  suggestions: GiftSuggestion[];
  loading: boolean;
  recipientName: string;
};

const formatPrice = (price?: number) => {
  if (!price) return "Price not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

const openLink = (link?: string) => {
  if (link) {
    Linking.openURL(link);
  }
};

export const GiftSuggestionsView: React.FC<GiftSuggestionsViewProps> = ({
  suggestions,
  loading,
  recipientName,
}) => {
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

  if (suggestions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="gift-outline" size={64} color="#ccc" />
        <Text variant="titleLarge" style={styles.emptyTitle}>
          No Gift Ideas Yet
        </Text>
        <Text variant="bodyMedium" style={styles.emptyText}>
          Gift suggestions will appear here once they're generated for{" "}
          {recipientName}.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.giftsContainer}>
      <View style={styles.suggestionsList}>
        {suggestions.map((suggestion) => (
          <Card
            key={suggestion.id}
            style={styles.suggestionCard}
            onPress={() => openLink(suggestion.link)}
            disabled={!suggestion.link}
          >
            {suggestion.image_url && (
              <Card.Cover
                source={{ uri: suggestion.image_url }}
                style={styles.suggestionImage}
              />
            )}
            <Card.Content>
              <Text variant="titleMedium" style={styles.suggestionTitle}>
                {suggestion.title}
              </Text>
              {suggestion.description && (
                <Text
                  variant="bodyMedium"
                  style={styles.suggestionDescription}
                  numberOfLines={2}
                >
                  {suggestion.description}
                </Text>
              )}
              <View style={styles.suggestionMeta}>
                <Text variant="titleLarge" style={styles.suggestionPrice}>
                  {formatPrice(suggestion.price)}
                </Text>
                {suggestion.link && (
                  <Button
                    mode="text"
                    icon="open-in-new"
                    compact
                    onPress={() => openLink(suggestion.link)}
                  >
                    View
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  giftsContainer: {
    padding: 16,
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
  suggestionsList: {
    gap: 12,
  },
  suggestionCard: {
    marginBottom: 12,
  },
  suggestionImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f0f0f0",
  },
  suggestionTitle: {
    marginBottom: 6,
  },
  suggestionDescription: {
    marginBottom: 12,
  },
  suggestionMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  suggestionPrice: {
    color: "#000000",
  },
});
