import { CisCard } from "@/components/admin/CisCard";
import { ConversationTestCard } from "@/components/admin/playground/ConversationTestCard";
import { GiverRecipientSelectors } from "@/components/admin/playground/GiverRecipientSelectors";
import { playgroundStyles } from "@/components/admin/playground/playground-styles";
import { TestModelCard } from "@/components/admin/playground/TestModelCard";
import type { PromptPlayground } from "@/hooks/use-prompt-playground";
import { AdminTheme } from "@/lib/admin-theme";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Card, Chip, Switch, Text, TextInput } from "react-native-paper";

type ContextPanelProps = {
  playground: PromptPlayground;
  isDesktop: boolean;
};

export const ContextPanel: React.FC<ContextPanelProps> = ({
  playground,
  isDesktop,
}) => {
  const panelStyle = [
    playgroundStyles.panel,
    isDesktop && styles.contextPanelDesktop,
  ];

  if (playground.isGiftGeneration) {
    return (
      <View style={panelStyle}>
        <TestModelCard playground={playground} />
        <Card mode="contained" style={playgroundStyles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={playgroundStyles.cardTitle}>
              Test Context
            </Text>
            <GiverRecipientSelectors playground={playground} />
          </Card.Content>
        </Card>

        {playground.selectedRecipientId && (
          <Card mode="contained" style={playgroundStyles.card}>
            <Card.Content style={styles.cronToggleRow}>
              <View>
                <Text variant="labelLarge">Simulate Cron</Text>
                <Text variant="bodySmall" style={styles.cronToggleHint}>
                  Include existing suggestions as avoid list
                </Text>
              </View>
              <Switch
                value={playground.simulateCron}
                onValueChange={playground.setSimulateCron}
              />
            </Card.Content>
          </Card>
        )}

        {playground.selectedRecipientId && (
          <CisCard
            isLoadingCis={playground.isLoadingCis}
            hasCisEdits={playground.hasCisEdits}
            editedCis={playground.editedCis}
            cisEdits={playground.cisEdits}
            resetCisEdits={playground.resetCisEdits}
            setCisField={playground.setCisField}
          />
        )}
      </View>
    );
  }

  return (
    <View style={panelStyle}>
      <TestModelCard playground={playground} />
      <Card mode="contained" style={playgroundStyles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={playgroundStyles.cardTitle}>
            {playground.selectedPromptDef?.label}
          </Text>
          <Text variant="bodySmall" style={styles.promptDescription}>
            {playground.selectedPromptDef?.description}
          </Text>

          {(playground.selectedPromptDef?.templateVariables.length ?? 0) >
            0 && (
            <View style={styles.templateVarsSection}>
              <Text variant="labelSmall" style={styles.templateVarsLabel}>
                Variables available at runtime
              </Text>
              <View style={styles.templateVarsRow}>
                {playground.selectedPromptDef?.templateVariables.map((v) => (
                  <Chip key={v} compact style={styles.templateVarChip}>
                    {`{{${v}}}`}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {playground.selectedPromptKey === "add_recipient_conversation" && (
        <ConversationTestCard playground={playground} />
      )}

      {playground.selectedPromptKey === "occasion_recommendations" && (
        <Card mode="contained" style={playgroundStyles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={playgroundStyles.cardTitle}>
              Test Context
            </Text>
            <Text variant="bodySmall" style={playgroundStyles.secondaryText}>
              Select a giver and recipient to test occasion recommendations.
            </Text>
            <GiverRecipientSelectors playground={playground} />
          </Card.Content>
        </Card>
      )}

      {playground.selectedPromptKey === "user_preferences_extraction" && (
        <Card mode="contained" style={playgroundStyles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={playgroundStyles.cardTitle}>
              Your Gifting Style
            </Text>
            <Text variant="bodySmall" style={playgroundStyles.secondaryText}>
              {
                "In the app, users type this in Settings → Gifting Preferences. It’s a single text box (no chat). On Save, we send this text + the system prompt to the LLM and parse JSON back."
              }
            </Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={6}
              placeholder="e.g. I like to give thoughtful, handmade gifts. I prefer spending moderately and planning ahead. I tend to be warm and personal with my gift choices..."
              value={playground.testInput}
              onChangeText={playground.setTestInput}
              style={styles.testTextInput}
              outlineStyle={styles.testTextInputOutline}
            />
          </Card.Content>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  contextPanelDesktop: {
    width: 300,
    minWidth: 300,
  },
  cronToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cronToggleHint: {
    color: AdminTheme.muted,
    marginTop: 2,
  },
  promptDescription: {
    color: AdminTheme.muted,
    marginBottom: 12,
  },
  templateVarsSection: {
    marginTop: 8,
  },
  templateVarsLabel: {
    color: AdminTheme.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    // eslint-disable-next-line no-restricted-syntax -- dense admin tooling is off the design type scale
    fontSize: 10,
    marginTop: 4,
    marginBottom: 2,
  },
  templateVarsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
  },
  templateVarChip: {
    backgroundColor: AdminTheme.panelStrong,
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
  },
  testTextInput: {
    marginTop: 8,
    backgroundColor: AdminTheme.inset,
    // eslint-disable-next-line no-restricted-syntax -- dense admin tooling is off the design type scale
    fontSize: 13,
  },
  testTextInputOutline: {
    borderRadius: 6,
  },
});
