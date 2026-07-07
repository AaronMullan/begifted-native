import {
  errorStyles,
  resultStyles,
} from "@/components/admin/playground/result-styles";
import { Colors } from "@/lib/colors";
import { formatOccasionType } from "@/utils/home-occasions";
import React from "react";
import { View } from "react-native";
import { Chip, Divider, Text } from "react-native-paper";

export const OccasionResultView: React.FC<{
  result: Record<string, unknown>;
}> = ({ result }) => {
  if ("error" in result) {
    return (
      <View style={errorStyles.resultError}>
        <Text variant="bodyMedium" style={errorStyles.errorText}>
          {String(result.error)}
        </Text>
      </View>
    );
  }

  const occasions = Array.isArray(result.primaryOccasions)
    ? result.primaryOccasions
    : [];
  const additional = Array.isArray(result.additionalSuggestions)
    ? result.additionalSuggestions
    : [];

  if (occasions.length === 0 && additional.length === 0) {
    return (
      <Text variant="bodyMedium" style={{ color: Colors.darks.brown }}>
        No occasions suggested.
      </Text>
    );
  }

  return (
    <View>
      {occasions.map((occ: any, i: number) => (
        <View key={i}>
          <View style={resultStyles.occasionHeader}>
            <Text variant="titleSmall">{occ.name || occ.type}</Text>
            {occ.isMilestone && (
              <Chip compact style={resultStyles.milestoneChip}>
                Milestone
              </Chip>
            )}
          </View>
          <View style={resultStyles.chipRow}>
            <Chip compact style={resultStyles.contextChip}>
              {formatOccasionType(String(occ.type ?? ""))}
            </Chip>
            {occ.suggestedDate && (
              <Text variant="bodySmall" style={resultStyles.occasionDate}>
                {occ.suggestedDate}
              </Text>
            )}
          </View>
          {occ.reasoning && (
            <Text variant="bodySmall" style={resultStyles.reasoning}>
              {occ.reasoning}
            </Text>
          )}
          {i < occasions.length - 1 && (
            <Divider style={{ marginVertical: 8 }} />
          )}
        </View>
      ))}
      {additional.length > 0 && (
        <View style={resultStyles.additionalSection}>
          <Text
            variant="labelSmall"
            style={{ color: Colors.darks.brown, marginBottom: 4 }}
          >
            Also consider
          </Text>
          <View style={resultStyles.chipRow}>
            {additional.map((s: string, i: number) => (
              <Chip key={i} compact style={resultStyles.contextChip}>
                {s}
              </Chip>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};
