import { CronContextCard } from "@/components/admin/playground/CronContextCard";
import { playgroundStyles } from "@/components/admin/playground/playground-styles";
import { ProductionContextCard } from "@/components/admin/playground/ProductionContextCard";
import { ResultContentCard } from "@/components/admin/playground/ResultContentCard";
import type { PromptPlayground } from "@/hooks/use-prompt-playground";
import { AdminTheme } from "@/lib/admin-theme";
import type { AdminProfileListItem } from "@/lib/api";
import type { Recipient } from "@/types/recipient";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

type ResultsDesktopProps = {
  playground: PromptPlayground;
};

// Desktop results: a test-run selector column beside the result content.
export const ResultsDesktop: React.FC<ResultsDesktopProps> = ({
  playground,
}) => {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showProductionContext, setShowProductionContext] = useState(true);

  const activeRun = playground.testRuns.find((r) => r.id === activeRunId);

  const selectedGiver = playground.profiles.find(
    (p: AdminProfileListItem) => p.id === playground.selectedGiverId
  );
  const selectedRecipient = playground.recipients.find(
    (r: Recipient) => r.id === playground.selectedRecipientId
  );

  const productionContext = playground.generationResult?.productionContext as
    Record<string, unknown> | undefined;
  const cronContext = playground.generationResult?.cronContext as
    Record<string, unknown> | undefined;
  const wrapperMessage = productionContext?.wrapperMessage as
    string | undefined;
  const cisNamesFromResult = (() => {
    if (!wrapperMessage) return {};
    try {
      const match = wrapperMessage.match(/CIS Data:\s*(\{[\s\S]*\})/);
      if (!match) return {};
      const cis = JSON.parse(match[1]);
      return {
        giverName: cis?.giver?.name as string | undefined,
        recipientName: cis?.recipient?.name as string | undefined,
      };
    } catch {
      return {};
    }
  })();
  // Only show the giver/recipient chip for prompt keys that actually consume
  // that context — otherwise the prior selection (e.g. from gift generation)
  // bleeds into prompts like user_preferences_extraction.
  const promptUsesRecipient =
    playground.isGiftGeneration ||
    playground.selectedPromptKey === "occasion_recommendations";
  const giverName = promptUsesRecipient
    ? (cisNamesFromResult.giverName ??
      selectedGiver?.full_name ??
      selectedGiver?.username)
    : undefined;
  const recipientName = promptUsesRecipient
    ? (cisNamesFromResult.recipientName ?? selectedRecipient?.name)
    : undefined;

  return (
    <View style={styles.row}>
      <Card
        mode="contained"
        style={[playgroundStyles.card, styles.testRunSelectorCard]}
      >
        <Card.Content>
          <Text variant="titleSmall" style={playgroundStyles.cardTitle}>
            Test Runs ({playground.testRuns.length})
          </Text>
          <ScrollView style={styles.testRunScrollList} nestedScrollEnabled>
            {playground.testRuns.length === 0 ? (
              <Text variant="bodySmall" style={playgroundStyles.secondaryText}>
                No test runs yet.
              </Text>
            ) : (
              playground.testRuns.map((run) => {
                const isActive = run.id === activeRunId;
                return (
                  <Card
                    mode="contained"
                    key={run.id}
                    style={[
                      playgroundStyles.historyItem,
                      isActive && styles.historyItemActive,
                    ]}
                    onPress={() => {
                      playground.loadTestRun(run);
                      setActiveRunId(run.id);
                    }}
                  >
                    <Card.Content style={playgroundStyles.historyItemContent}>
                      <Text
                        variant="labelSmall"
                        style={playgroundStyles.historyDate}
                      >
                        {new Date(run.created_at).toLocaleString()}
                      </Text>
                      {run.ai_provider && run.ai_model && (
                        <Text
                          variant="bodySmall"
                          style={styles.historyModelText}
                        >
                          {`${run.ai_provider} · ${run.ai_model}`}
                        </Text>
                      )}
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </ScrollView>
        </Card.Content>
      </Card>

      <View style={styles.resultContentColumn}>
        <ResultContentCard
          playground={playground}
          desktop
          meta={{
            provider: activeRun?.ai_provider,
            model: activeRun?.ai_model,
            giverName,
            recipientName,
          }}
        />

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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  testRunSelectorCard: {
    width: 240,
    minWidth: 240,
  },
  testRunScrollList: {
    maxHeight: 500,
  },
  historyItemActive: {
    borderWidth: 2,
    borderColor: AdminTheme.accentBright,
  },
  historyModelText: {
    color: AdminTheme.muted,
    marginTop: 2,
  },
  resultContentColumn: {
    flex: 1,
    gap: 12,
  },
});
