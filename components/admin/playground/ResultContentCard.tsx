import { ConversationResultView } from "@/components/admin/playground/ConversationResultView";
import { GenerationResultView } from "@/components/admin/playground/GenerationResultView";
import { JsonResultView } from "@/components/admin/playground/JsonResultView";
import { OccasionResultView } from "@/components/admin/playground/OccasionResultView";
import { playgroundStyles } from "@/components/admin/playground/playground-styles";
import { PreferencesResultView } from "@/components/admin/playground/PreferencesResultView";
import type { PromptPlayground } from "@/hooks/use-prompt-playground";
import { AdminTheme } from "@/lib/admin-theme";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Chip, Text } from "react-native-paper";

export type ResultMeta = {
  provider?: string | null;
  model?: string | null;
  giverName?: string | null;
  recipientName?: string | null;
};

type ResultContentCardProps = {
  playground: PromptPlayground;
  // Desktop lays the gift results out horizontally and shows run metadata
  // chips beside the title; mobile stacks them with a plain title.
  desktop?: boolean;
  meta?: ResultMeta;
};

export const ResultContentCard: React.FC<ResultContentCardProps> = ({
  playground,
  desktop = false,
  meta,
}) => {
  const result = playground.generationResult;

  if (!result) {
    return (
      <Card
        mode="contained"
        style={[playgroundStyles.card, styles.emptyResultsCard]}
      >
        <Card.Content style={styles.emptyResultsContent}>
          <Text variant="bodyMedium" style={styles.emptyResultsText}>
            {playground.isGiftGeneration
              ? "Select a giver and recipient, then click Generate to see results here."
              : `Click Test to run the ${
                  playground.selectedPromptDef?.label ?? "prompt"
                } and see results here.`}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  const title = playground.isGiftGeneration
    ? "Generation Results"
    : "Test Results";

  return (
    <Card mode="contained" style={playgroundStyles.card}>
      <Card.Content>
        {desktop ? (
          <View style={styles.resultTitleRow}>
            <Text
              variant="titleSmall"
              style={[playgroundStyles.cardTitle, { marginBottom: 0 }]}
            >
              {title}
            </Text>
            <View style={styles.resultMetaHeader}>
              {meta?.provider && meta.model && (
                <Chip compact style={styles.metaChip}>
                  {`${meta.provider} · ${meta.model}`}
                </Chip>
              )}
              {(meta?.giverName || meta?.recipientName) && (
                <Chip compact style={styles.metaChip}>
                  {`${meta.giverName ?? "?"} → ${meta.recipientName ?? "?"}`}
                </Chip>
              )}
            </View>
          </View>
        ) : (
          <Text variant="titleSmall" style={playgroundStyles.cardTitle}>
            {title}
          </Text>
        )}
        {playground.isGiftGeneration ? (
          <GenerationResultView result={result} horizontal={desktop} />
        ) : playground.selectedPromptKey === "add_recipient_conversation" ? (
          <ConversationResultView result={result} />
        ) : playground.selectedPromptKey === "occasion_recommendations" ? (
          <OccasionResultView result={result} />
        ) : playground.selectedPromptKey === "user_preferences_extraction" ? (
          <PreferencesResultView result={result} />
        ) : (
          <JsonResultView result={result} />
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  emptyResultsCard: {
    minHeight: 120,
  },
  emptyResultsContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyResultsText: {
    color: AdminTheme.muted,
    textAlign: "center",
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  resultMetaHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  metaChip: {
    backgroundColor: AdminTheme.panelStrong,
  },
});
