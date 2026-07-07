import {
  errorStyles,
  resultStyles,
} from "@/components/admin/playground/result-styles";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, Chip, Text } from "react-native-paper";

export const ConversationResultView: React.FC<{
  result: Record<string, unknown>;
}> = ({ result }) => {
  const [showContext, setShowContext] = useState(true);
  const [showResolvedPrompt, setShowResolvedPrompt] = useState(false);
  const ctx = result.conversationContext as
    | {
        readiness?: {
          state?: string;
          has_recipient_anchor?: boolean;
          has_occasion_anchor?: boolean;
          has_specificity_anchor?: boolean;
          reason?: string;
        };
        user_skipped_specificity?: boolean;
        needs_occasion_date?: boolean;
        occasion_needing_date?: string;
        [key: string]: unknown;
      }
    | undefined;

  if ("error" in result) {
    return (
      <View style={errorStyles.resultError}>
        <Text variant="bodyMedium" style={errorStyles.errorText}>
          {String(result.error)}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text variant="labelSmall" style={resultStyles.sectionLabel}>
        Latest Turn Metadata
      </Text>
      <View style={resultStyles.statusRow}>
        <Chip
          compact
          style={
            result.shouldShowNextStepButton
              ? resultStyles.activeChip
              : resultStyles.inactiveChip
          }
        >
          {result.shouldShowNextStepButton
            ? "Next-step button: visible"
            : "Next-step button: hidden"}
        </Chip>
      </View>
      {ctx?.readiness && (
        <View style={resultStyles.statusRow}>
          <Chip compact style={resultStyles.contextChip}>
            {String(ctx.readiness.state)}
          </Chip>
        </View>
      )}
      {ctx?.readiness && (
        <View style={resultStyles.chipRow}>
          <Chip
            compact
            style={
              ctx.readiness.has_recipient_anchor
                ? resultStyles.anchorActive
                : resultStyles.anchorMissing
            }
          >
            {"Recipient"}
          </Chip>
          <Chip
            compact
            style={
              ctx.readiness.has_occasion_anchor
                ? resultStyles.anchorActive
                : resultStyles.anchorMissing
            }
          >
            {"Occasion"}
          </Chip>
          <Chip
            compact
            style={
              ctx.readiness.has_specificity_anchor ||
              ctx.user_skipped_specificity
                ? resultStyles.anchorActive
                : resultStyles.anchorMissing
            }
          >
            {ctx.user_skipped_specificity
              ? "Specificity (skipped)"
              : "Specificity"}
          </Chip>
        </View>
      )}
      {ctx?.readiness?.reason && (
        <Text variant="bodySmall" style={resultStyles.contextField}>
          {ctx.readiness.reason}
        </Text>
      )}
      {ctx?.needs_occasion_date && (
        <Text variant="bodySmall" style={resultStyles.contextField}>
          {"Needs date for: " + String(ctx.occasion_needing_date)}
        </Text>
      )}
      {ctx && (
        <>
          <Button
            mode="text"
            onPress={() => setShowContext(!showContext)}
            icon={showContext ? "chevron-up" : "chevron-down"}
            compact
            style={resultStyles.collapseBtn}
          >
            Extracted Context
          </Button>
          {showContext && ctx && (
            <View style={resultStyles.contextBox}>
              {ctx.name != null && (
                <Text variant="bodySmall" style={resultStyles.contextField}>
                  {"Name: " + String(ctx.name)}
                </Text>
              )}
              {ctx.relationship != null && (
                <Text variant="bodySmall" style={resultStyles.contextField}>
                  {"Relationship: " + String(ctx.relationship)}
                </Text>
              )}
              {Array.isArray(ctx.interests) && ctx.interests.length > 0 && (
                <View style={resultStyles.chipRow}>
                  <Text variant="bodySmall" style={resultStyles.contextField}>
                    {"Interests: "}
                  </Text>
                  {(ctx.interests as string[]).map((interest, i) => (
                    <Chip key={i} compact style={resultStyles.contextChip}>
                      {interest}
                    </Chip>
                  ))}
                </View>
              )}
              {ctx.birthday != null && (
                <Text variant="bodySmall" style={resultStyles.contextField}>
                  {"Birthday: " + String(ctx.birthday)}
                </Text>
              )}
              {ctx.readiness_score != null && (
                <Text variant="bodySmall" style={resultStyles.contextField}>
                  {"Legacy score: " + String(ctx.readiness_score) + "/10"}
                </Text>
              )}
            </View>
          )}
        </>
      )}
      {"resolvedSystemPrompt" in result && (
        <>
          <Button
            mode="text"
            onPress={() => setShowResolvedPrompt(!showResolvedPrompt)}
            icon={showResolvedPrompt ? "chevron-up" : "chevron-down"}
            compact
            style={resultStyles.collapseBtn}
          >
            {result.resolvedSystemPrompt === null
              ? "Resolved Prompt (skipped)"
              : "Resolved Prompt"}
          </Button>
          {showResolvedPrompt && (
            <View style={resultStyles.contextBox}>
              {result.resolvedSystemPrompt === null ? (
                <Text variant="bodySmall" style={resultStyles.contextField}>
                  {
                    'Readiness state was "ready" — deterministic wrap-up was used. The system prompt was not sent to the LLM.'
                  }
                </Text>
              ) : (
                <ScrollView style={resultStyles.resolvedPromptScroll}>
                  <Text
                    variant="bodySmall"
                    style={resultStyles.resolvedPromptText}
                  >
                    {String(result.resolvedSystemPrompt)}
                  </Text>
                </ScrollView>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
};
