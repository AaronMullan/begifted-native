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

type ConversationTestCardProps = {
  playground: PromptPlayground;
};

export const ConversationTestCard: React.FC<ConversationTestCardProps> = ({
  playground,
}) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  function handleSend() {
    const msg = input.trim();
    if (!msg || playground.isConversationLoading) return;
    setInput("");
    playground.sendConversationMessage(msg);
  }

  return (
    <Card mode="contained" style={playgroundStyles.card}>
      <Card.Content>
        <View style={playgroundStyles.cardTitleRow}>
          <Text variant="titleSmall" style={playgroundStyles.cardTitle}>
            Conversation Test
          </Text>
          {playground.testMessages.length > 0 && (
            <Button
              mode="text"
              onPress={playground.clearTestMessages}
              compact
              icon="delete"
            >
              Reset
            </Button>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.conversationScroll}
          nestedScrollEnabled
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {playground.testMessages.length === 0 &&
            !playground.isConversationLoading && (
              <View style={playgroundStyles.welcomeMessage}>
                <Text variant="bodySmall" style={playgroundStyles.welcomeText}>
                  Type a message to start the conversation test.
                </Text>
              </View>
            )}
          {playground.testMessages.map((msg, i) => (
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
          {playground.isConversationLoading && (
            <View style={playgroundStyles.loadingBubble}>
              <ActivityIndicator size="small" />
            </View>
          )}
        </ScrollView>

        <View style={playgroundStyles.chatInputRow}>
          <TextInput
            mode="outlined"
            placeholder="Type a message..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            style={playgroundStyles.chatInputField}
            dense
            disabled={playground.isConversationLoading}
          />
          <IconButton
            icon="send"
            onPress={handleSend}
            disabled={!input.trim() || playground.isConversationLoading}
          />
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  conversationScroll: {
    maxHeight: 350,
    borderRadius: 8,
    backgroundColor: AdminTheme.inset,
    padding: 8,
    marginBottom: 8,
  },
});
