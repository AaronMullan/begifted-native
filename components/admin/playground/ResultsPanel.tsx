import { CronContextCard } from "@/components/admin/playground/CronContextCard";
import { playgroundStyles } from "@/components/admin/playground/playground-styles";
import { ProductionContextCard } from "@/components/admin/playground/ProductionContextCard";
import { ResultContentCard } from "@/components/admin/playground/ResultContentCard";
import type { PromptPlayground } from "@/hooks/use-prompt-playground";
import { AdminTheme } from "@/lib/admin-theme";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Chip, IconButton, Text } from "react-native-paper";

type ResultsPanelProps = {
  playground: PromptPlayground;
};

// Stacked (mobile) results: result card, gift-generation context cards, and a
// collapsible test-run history. Desktop uses ResultsDesktop instead.
export const ResultsPanel: React.FC<ResultsPanelProps> = ({ playground }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showProductionContext, setShowProductionContext] = useState(true);

  const productionContext = playground.generationResult?.productionContext as
    Record<string, unknown> | undefined;
  const cronContext = playground.generationResult?.cronContext as
    Record<string, unknown> | undefined;

  return (
    <View style={playgroundStyles.panel}>
      <ResultContentCard playground={playground} />

      {playground.isGiftGeneration && !!productionContext && (
        <ProductionContextCard
          productionContext={productionContext}
          expanded={showProductionContext}
          onToggle={() => setShowProductionContext(!showProductionContext)}
        />
      )}

      {playground.isGiftGeneration && !!cronContext && (
        <CronContextCard cronContext={cronContext} />
      )}

      <Card mode="contained" style={playgroundStyles.card}>
        <Card.Content>
          <View style={playgroundStyles.cardTitleRow}>
            <Text variant="titleSmall" style={playgroundStyles.cardTitle}>
              Test Runs ({playground.testRuns.length})
            </Text>
            <IconButton
              icon={showHistory ? "chevron-up" : "chevron-down"}
              size={18}
              onPress={() => setShowHistory(!showHistory)}
              style={styles.collapseIcon}
            />
          </View>
          {showHistory && (
            <View style={styles.historyList}>
              {playground.testRuns.map((run) => (
                <Card
                  mode="contained"
                  key={run.id}
                  style={playgroundStyles.historyItem}
                  onPress={() => playground.loadTestRun(run)}
                >
                  <Card.Content style={playgroundStyles.historyItemContent}>
                    <View style={styles.historyHeader}>
                      <Text
                        variant="labelSmall"
                        style={playgroundStyles.historyDate}
                      >
                        {new Date(run.created_at).toLocaleString()}
                      </Text>
                      {run.ai_provider && run.ai_model && (
                        <Chip compact style={styles.historyModelChip}>
                          {`${run.ai_provider} · ${run.ai_model}`}
                        </Chip>
                      )}
                    </View>
                    <Text
                      variant="bodySmall"
                      numberOfLines={2}
                      style={styles.historyPreview}
                    >
                      {run.custom_system_prompt.substring(0, 100)}...
                    </Text>
                  </Card.Content>
                </Card>
              ))}
              {playground.testRuns.length === 0 && (
                <Text
                  variant="bodySmall"
                  style={playgroundStyles.secondaryText}
                >
                  No test runs yet.
                </Text>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  collapseIcon: {
    margin: 0,
  },
  historyList: {
    gap: 6,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  historyModelChip: {
    height: 24,
  },
  historyPreview: {
    color: AdminTheme.muted,
  },
});
