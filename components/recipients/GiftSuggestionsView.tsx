import React, { useState, useMemo } from "react";
import { StyleSheet, View, Linking } from "react-native";
import {
  ActivityIndicator,
  Text,
  Button,
  Card,
  List,
} from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import type { GiftSuggestion } from "../../types/recipient";

type GiftSuggestionsViewProps = {
  suggestions: GiftSuggestion[];
  loading: boolean;
  recipientName: string;
  isGenerating?: boolean;
};

type DateGroup = {
  dateKey: string;
  dateLabel: string;
  suggestions: GiftSuggestion[];
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

const formatDateLabel = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const dateToCheck = new Date(date);
  dateToCheck.setHours(0, 0, 0, 0);

  if (dateToCheck.getTime() === today.getTime()) {
    return "Today";
  } else if (dateToCheck.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else if (dateToCheck >= lastWeek) {
    return "Last Week";
  } else {
    return dateToCheck.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
};

const groupSuggestionsByDate = (suggestions: GiftSuggestion[]): DateGroup[] => {
  const groups: Map<string, DateGroup> = new Map();

  suggestions.forEach((suggestion) => {
    const date = new Date(suggestion.generated_at);
    const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const dateLabel = formatDateLabel(date);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        dateKey,
        dateLabel,
        suggestions: [],
      });
    }

    groups.get(dateKey)!.suggestions.push(suggestion);
  });

  // Sort groups by date descending (newest first)
  return Array.from(groups.values()).sort((a, b) => {
    return b.dateKey.localeCompare(a.dateKey);
  });
};

const SuggestionCard: React.FC<{ suggestion: GiftSuggestion }> = ({
  suggestion,
}) => {
  return (
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
  );
};

export const GiftSuggestionsView: React.FC<GiftSuggestionsViewProps> = ({
  suggestions,
  loading,
  recipientName,
  isGenerating = false,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Show only first 5 suggestions initially
  const recentSuggestions = useMemo(
    () => suggestions.slice(0, 5),
    [suggestions]
  );
  const olderSuggestions = useMemo(() => suggestions.slice(5), [suggestions]);

  // Group older suggestions by date
  const dateGroups = useMemo(
    () => groupSuggestionsByDate(olderSuggestions),
    [olderSuggestions]
  );

  const toggleGroup = (dateKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
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

  if (suggestions.length === 0 && !isGenerating) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="card-giftcard" size={64} color="#ccc" />
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
      {/* Show generating state */}
      {isGenerating && (
        <View style={styles.generatingContainer}>
          <ActivityIndicator size="small" />
          <Text variant="bodyMedium" style={styles.generatingText}>
            Generating gift suggestions...
          </Text>
        </View>
      )}

      {/* Recent suggestions (first 5) */}
      {recentSuggestions.length > 0 && (
        <View style={styles.suggestionsList}>
          {recentSuggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </View>
      )}

      {/* Older suggestions grouped by date */}
      {dateGroups.length > 0 && (
        <View style={styles.dateGroupsContainer}>
          <Text variant="titleMedium" style={styles.previousSuggestionsTitle}>
            Previous Suggestions
          </Text>
          {dateGroups.map((group) => (
            <List.Accordion
              key={group.dateKey}
              title={group.dateLabel}
              left={(props) => <List.Icon {...props} icon="calendar" />}
              expanded={expandedGroups.has(group.dateKey)}
              onPress={() => toggleGroup(group.dateKey)}
              style={styles.accordion}
            >
              <View style={styles.groupedSuggestions}>
                {group.suggestions.map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))}
              </View>
            </List.Accordion>
          ))}
        </View>
      )}
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
  generatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 16,
  },
  generatingText: {
    marginLeft: 12,
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
  dateGroupsContainer: {
    marginTop: 24,
  },
  previousSuggestionsTitle: {
    marginBottom: 16,
    fontWeight: "600",
  },
  accordion: {
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  groupedSuggestions: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
