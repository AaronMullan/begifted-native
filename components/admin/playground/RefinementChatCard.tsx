import { playgroundStyles } from "@/components/admin/playground/playground-styles";
import type { PromptPlayground } from "@/hooks/use-prompt-playground";
import { AdminTheme } from "@/lib/admin-theme";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  IconButton,
  Text,
  TextInput,
} from "react-native-paper";

type RefinementChatCardProps = {
  playground: PromptPlayground;
};

export const RefinementChatCard: React.FC<RefinementChatCardProps> = ({
  playground,
}) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  function handleSend() {
    const msg = input.trim();
    if (!msg || playground.isRefining) return;
    setInput("");
    playground.sendRefinementMessage(msg);
  }

  return (
    <Card mode="contained" style={playgroundStyles.card}>
      <Card.Content style={styles.chatCardContent}>
        <Text
          variant="titleSmall"
          style={[playgroundStyles.cardTitle, styles.chatCardTitle]}
        >
          Refinement Chat
        </Text>
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {playground.chatMessages.length === 0 && (
            <View style={playgroundStyles.welcomeMessage}>
              <Text variant="bodySmall" style={playgroundStyles.welcomeText}>
                {
                  "Describe how you'd like to change the prompt. AI will rewrite it for you."
                }
              </Text>
            </View>
          )}
          {playground.chatMessages.map((msg, i) => (
            <View
              key={i}
              style={[
                playgroundStyles.messageBubble,
                msg.role === "user"
                  ? playgroundStyles.userBubble
                  : playgroundStyles.assistantBubble,
              ]}
            >
              <Text
                variant="bodySmall"
                style={
                  msg.role === "user"
                    ? playgroundStyles.userText
                    : playgroundStyles.assistantText
                }
              >
                {msg.content}
              </Text>
            </View>
          ))}
          {playground.isRefining && (
            <View style={playgroundStyles.loadingBubble}>
              <ActivityIndicator size="small" />
            </View>
          )}
          {playground.pendingRefinement && !playground.isRefining && (
            <View style={styles.approvalRow}>
              <Button
                mode="contained"
                onPress={playground.approvePendingRefinement}
                icon="check"
                style={styles.approveButton}
                compact
              >
                Apply Changes
              </Button>
              <Button
                mode="outlined"
                onPress={playground.discardPendingRefinement}
                icon="close"
                compact
              >
                Discard
              </Button>
            </View>
          )}
        </ScrollView>
        <View style={playgroundStyles.chatInputRow}>
          <TextInput
            mode="outlined"
            placeholder="Describe prompt changes..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            style={playgroundStyles.chatInputField}
            dense
            disabled={playground.isRefining}
          />
          <IconButton
            icon="send"
            onPress={handleSend}
            disabled={!input.trim() || playground.isRefining}
          />
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  chatCardContent: {
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  chatCardTitle: {
    paddingHorizontal: 16,
  },
  chatScroll: {
    maxHeight: 250,
    paddingHorizontal: 16,
  },
  approvalRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.border,
    backgroundColor: AdminTheme.panelStrong,
  },
  approveButton: {
    backgroundColor: AdminTheme.accent,
  },
});
