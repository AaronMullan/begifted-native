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

  // A failed deploy's message must not greet the next deploy attempt.
  function handleDismiss() {
    playground.resetDeployError();
    onDismiss();
  }

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
      <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
        <Dialog.Title>Deploy to Production</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.body}>
            This will update the live{" "}
            {playground.selectedPromptDef?.label ?? "prompt"}. Are you sure?
          </Text>
          {playground.deployError && (
            <Text variant="bodyMedium" style={styles.warning}>
              {playground.deployError.message}
            </Text>
          )}
          {playground.rulesNotInLivePrompt && (
            <Text variant="bodyMedium" style={styles.warning}>
              The live Add Recipient Conversation prompt doesn&apos;t include{" "}
              {"{{requiredFields}}"} yet. These rules will change when the
              intake counts a detail as done, but the conversation will keep
              asking by its own wording, and the two can disagree. Add{" "}
              {"{{requiredFields}}"} to that prompt before changing a rule.
            </Text>
          )}
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
          <Button onPress={handleDismiss}>Cancel</Button>
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
