import type { PromptPlayground } from "@/hooks/use-prompt-playground";
import { Colors } from "@/lib/colors";
import { findMissingSections } from "@/lib/prompt-registry";
import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Dialog, Portal, Text, TextInput } from "react-native-paper";

type DeployDialogProps = {
  playground: PromptPlayground;
  visible: boolean;
  onDismiss: () => void;
};

export const DeployDialog: React.FC<DeployDialogProps> = ({
  playground,
  visible,
  onDismiss,
}) => {
  const [notes, setNotes] = useState("");

  // Code outside the playground slices these headings out of the live prompt.
  // Renaming one fails silently at runtime — the consumer proceeds with the
  // section missing — so this dialog is where the loss has to be stated.
  const missingSections = findMissingSections(
    playground.selectedPromptDef,
    playground.currentPrompt
  );

  async function handleDeploy() {
    try {
      await playground.deployToProduction(notes);
      onDismiss();
      setNotes("");
    } catch (err) {
      console.error("Deploy error:", err);
    }
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Deploy to Production</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.body}>
            This will update the live{" "}
            {playground.selectedPromptDef?.label ?? "prompt"}. Are you sure?
          </Text>
          {missingSections.length > 0 && (
            <Text variant="bodyMedium" style={styles.warning}>
              {missingSections.join(", ")} is no longer in this prompt. Other
              parts of BeGifted read that section out of the live prompt by its
              heading — deploying this drops it from them with no error. Restore
              the heading unless you have already updated the code that reads
              it.
            </Text>
          )}
          <TextInput
            mode="outlined"
            label="Change notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={handleDeploy}
            disabled={!notes.trim()}
            loading={playground.isDeploying}
          >
            Deploy
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 16,
  },
  body: {
    marginBottom: 12,
  },
  warning: {
    marginBottom: 12,
    color: Colors.brand.destructiveRed,
  },
  notesInput: {
    marginTop: 8,
  },
});
