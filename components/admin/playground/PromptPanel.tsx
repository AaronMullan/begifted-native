import { playgroundStyles } from "@/components/admin/playground/playground-styles";
import { RefinementChatCard } from "@/components/admin/playground/RefinementChatCard";
import type { PromptPlayground } from "@/hooks/use-prompt-playground";
import { AdminTheme } from "@/lib/admin-theme";
import React, { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Text, TextInput } from "react-native-paper";

type PromptPanelProps = {
  playground: PromptPlayground;
  isDesktop: boolean;
};

export const PromptPanel: React.FC<PromptPanelProps> = ({
  playground,
  isDesktop,
}) => {
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);

  return (
    <View
      style={[playgroundStyles.panel, isDesktop && styles.promptPanelDesktop]}
    >
      <Card mode="contained" style={[playgroundStyles.card, styles.promptCard]}>
        <Card.Content>
          <View style={playgroundStyles.cardTitleRow}>
            <Text variant="titleSmall" style={playgroundStyles.cardTitle}>
              System Prompt
            </Text>
            <View style={styles.promptBadges}>
              {playground.hasPromptChanged && (
                <Chip compact style={styles.modifiedBadge}>
                  Modified
                </Chip>
              )}
              <Button
                mode="text"
                onPress={playground.resetPrompt}
                disabled={!playground.hasPromptChanged}
                compact
              >
                Reset
              </Button>
            </View>
          </View>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={isDesktop ? 20 : 12}
            value={playground.currentPrompt}
            onChangeText={playground.setCurrentPrompt}
            style={styles.promptInput}
            contentStyle={styles.promptInputContent}
            outlineStyle={styles.promptOutline}
          />

          <Button
            mode="text"
            onPress={() => setShowDefaultPrompt(!showDefaultPrompt)}
            icon={showDefaultPrompt ? "chevron-up" : "chevron-down"}
            contentStyle={styles.collapseContent}
            style={styles.defaultPromptToggle}
            compact
          >
            Active Production Prompt
          </Button>
          {showDefaultPrompt && (
            <View style={styles.defaultPromptBox}>
              <Text variant="bodySmall" style={playgroundStyles.monoText}>
                {playground.originalPrompt}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <RefinementChatCard playground={playground} />
    </View>
  );
};

const styles = StyleSheet.create({
  promptPanelDesktop: {
    flex: 1,
  },
  promptCard: {
    flex: 1,
  },
  promptBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modifiedBadge: {
    backgroundColor: "rgba(171,138,62,0.28)",
  },
  promptInput: {
    // eslint-disable-next-line no-restricted-syntax -- dense admin tooling is off the design type scale
    fontSize: 13,
    backgroundColor: AdminTheme.inset,
  },
  promptOutline: {
    borderRadius: 6,
  },
  promptInputContent: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    // eslint-disable-next-line no-restricted-syntax -- monospace readout; the type scale has no mono token
    fontSize: 12,
  },
  defaultPromptToggle: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  collapseContent: {
    justifyContent: "flex-start",
  },
  defaultPromptBox: {
    backgroundColor: AdminTheme.inset,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
});
