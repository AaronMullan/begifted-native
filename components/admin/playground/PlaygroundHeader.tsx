import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { playgroundStyles } from "@/components/admin/playground/playground-styles";
import type { PromptPlayground } from "@/hooks/use-prompt-playground";
import { AdminTheme } from "@/lib/admin-theme";
import type { PromptDefinition } from "@/lib/prompt-registry";
import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Menu } from "react-native-paper";

type PlaygroundHeaderProps = {
  playground: PromptPlayground;
  onDeployPress: () => void;
};

export const PlaygroundHeader: React.FC<PlaygroundHeaderProps> = ({
  playground,
  onDeployPress,
}) => {
  const [promptMenuVisible, setPromptMenuVisible] = useState(false);

  return (
    <AdminNavbar
      title="Prompt Playground"
      productionOverride={
        playground.productionProvider && playground.productionModel
          ? {
              provider: playground.productionProvider,
              model: playground.productionModel,
            }
          : undefined
      }
      actions={
        <>
          <Button
            mode="contained"
            onPress={playground.generateWithPrompt}
            disabled={!playground.canGenerate}
            loading={playground.isGenerating}
            icon="auto-fix"
            style={styles.headerButton}
          >
            {playground.isGiftGeneration ? "Generate" : "Test"}
          </Button>
          <Button
            mode="contained"
            onPress={onDeployPress}
            disabled={!playground.hasPromptChanged || playground.isDeploying}
            loading={playground.isDeploying}
            buttonColor={AdminTheme.accent}
            icon="rocket-launch"
            style={styles.headerButton}
          >
            Deploy Prompt
          </Button>
        </>
      }
    >
      <Menu
        visible={promptMenuVisible}
        onDismiss={() => setPromptMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setPromptMenuVisible(true)}
            icon="swap-horizontal"
            style={styles.promptSelector}
            contentStyle={playgroundStyles.selectorContent}
          >
            {playground.selectedPromptDef?.label ?? "Select Prompt"}
          </Button>
        }
        contentStyle={playgroundStyles.menuContent}
      >
        {playground.promptRegistry.map((def: PromptDefinition) => (
          <Menu.Item
            key={def.key}
            onPress={() => {
              playground.setSelectedPromptKey(def.key);
              setPromptMenuVisible(false);
            }}
            title={def.label}
            leadingIcon={
              def.key === playground.selectedPromptKey ? "check" : undefined
            }
          />
        ))}
      </Menu>
    </AdminNavbar>
  );
};

const styles = StyleSheet.create({
  promptSelector: {
    borderRadius: 8,
  },
  headerButton: {
    borderRadius: 8,
  },
});
