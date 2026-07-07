import { errorStyles } from "@/components/admin/playground/result-styles";
import { Colors } from "@/lib/colors";
import { openLink } from "@/lib/open-link";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Chip, Divider, IconButton, Text } from "react-native-paper";

export type GenerationResultViewProps = {
  result: Record<string, unknown>;
  horizontal?: boolean;
};

export type Suggestion = {
  name: string;
  retailer: string;
  url: string;
  price_usd: number;
  category: string;
  tags: string[];
  reason: string;
  image_url?: string;
};

export const GenerationResultView: React.FC<GenerationResultViewProps> = ({
  result,
  horizontal = false,
}) => {
  if ("error" in result) {
    return (
      <View style={errorStyles.resultError}>
        <Text variant="bodyMedium" style={errorStyles.errorText}>
          {String(result.error)}
        </Text>
      </View>
    );
  }

  const suggestions = (result.suggestions as Suggestion[]) || [];

  if (suggestions.length === 0) {
    return <Text variant="bodyMedium">No suggestions generated.</Text>;
  }

  return (
    <View style={horizontal ? styles.suggestionsRow : styles.suggestionsList}>
      {suggestions.map((suggestion, i) => (
        <View
          key={i}
          style={horizontal ? styles.suggestionCard : styles.suggestionItem}
        >
          <View style={styles.suggestionHeader}>
            <Chip compact style={i === 0 ? styles.primaryChip : styles.altChip}>
              {i === 0 ? "Top Pick" : `#${i + 1}`}
            </Chip>
            {suggestion.url && (
              <IconButton
                icon="open-in-new"
                size={16}
                onPress={() => {
                  void openLink(suggestion.url);
                }}
                style={styles.suggestionLink}
              />
            )}
          </View>
          <Text variant="titleSmall">{suggestion.name}</Text>
          <Text variant="bodySmall" style={styles.suggestionMeta}>
            ${suggestion.price_usd} — {suggestion.retailer}
          </Text>
          {suggestion.reason && (
            <Text variant="bodySmall" style={styles.suggestionReason}>
              {suggestion.reason}
            </Text>
          )}
          {suggestion.category && (
            <View style={styles.suggestionTags}>
              <Chip compact style={styles.categoryChip}>
                {suggestion.category}
              </Chip>
              {suggestion.tags?.map((tag, j) => (
                <Chip key={j} compact style={styles.tagChip}>
                  {tag}
                </Chip>
              ))}
            </View>
          )}
          {!horizontal && i < suggestions.length - 1 && (
            <Divider style={styles.suggestionDivider} />
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  suggestionsList: {
    gap: 0,
  },
  suggestionItem: {
    paddingVertical: 8,
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  suggestionCard: {
    flex: 1,
    minWidth: 200,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 8,
  },
  suggestionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  suggestionLink: {
    margin: 0,
  },
  suggestionMeta: {
    color: Colors.blues.dark,
    marginTop: 2,
  },
  suggestionReason: {
    color: Colors.darks.brown,
    fontStyle: "italic",
    marginTop: 4,
  },
  suggestionTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  suggestionDivider: {
    marginTop: 12,
  },
  primaryChip: {
    backgroundColor: Colors.yellows.gold,
  },
  altChip: {
    backgroundColor: Colors.neutrals.light,
  },
  categoryChip: {
    backgroundColor: Colors.neutrals.light,
  },
  tagChip: {
    backgroundColor: "#f0f0f0",
  },
});
