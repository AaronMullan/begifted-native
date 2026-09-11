import type { PromptPlayground } from "@/hooks/use-prompt-playground";
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
  notesInput: {
    marginTop: 8,
  },
});
