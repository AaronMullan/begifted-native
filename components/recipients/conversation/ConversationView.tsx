import React, { useState, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from "react-native";
import {
  Text,
  IconButton,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import { Message } from "@/hooks/use-add-recipient-flow";
import { BOTTOM_NAV_HEIGHT } from "@/lib/constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ConversationViewProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<any>;
  onNavigateBack: () => void;
  onSendMessage: (message: string) => Promise<void>;
  onFinishConversation: () => Promise<void>;
  shouldShowNextStepButton: boolean;
  conversationContext: string;
  title?: string;
  finishButtonLabel?: string;
}

export function ConversationView({
  messages,
  isLoading,
  messagesEndRef,
  onNavigateBack,
  onSendMessage,
  onFinishConversation,
  shouldShowNextStepButton,
  conversationContext: _conversationContext,
  title = "Add Recipient",
  finishButtonLabel = "Let's Move to the Next Step",
}: ConversationViewProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const inputBottomPadding = BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 0);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isSending || isLoading) return;

    const messageToSend = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);

    try {
      await onSendMessage(messageToSend);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor="#000000"
          onPress={onNavigateBack}
          style={styles.backButton}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.role === "user"
                ? styles.userMessageContainer
                : styles.assistantMessageContainer,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.role === "user"
                  ? styles.userMessageBubble
                  : styles.assistantMessageBubble,
              ]}
            >
              <Text
                variant="bodyLarge"
                style={[
                  styles.messageText,
                  message.role === "user"
                    ? styles.userMessageText
                    : styles.assistantMessageText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          </View>
        ))}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
            <Text variant="bodyMedium" style={styles.loadingText}>
              Thinking...
            </Text>
          </View>
        )}

        <View ref={messagesEndRef} />
      </ScrollView>

      {/* Input Area */}
      <View style={[styles.inputContainer, { paddingBottom: inputBottomPadding }]}>
        {shouldShowNextStepButton && (
          <Button
            mode="contained"
            buttonColor="#000000"
            onPress={onFinishConversation}
            disabled={isLoading || isSending}
            style={styles.nextStepButton}
          >
            {finishButtonLabel}
          </Button>
        )}

        <View style={styles.inputRow}>
          <RNTextInput
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Type your message..."
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
            multiline
            editable={!isLoading && !isSending}
            autoComplete="off"
            autoCorrect={false}
            spellCheck={false}
            textContentType="none"
            importantForAutofill="no"
            placeholderTextColor="#999"
            style={styles.textInput}
          />
          <IconButton
            icon="send"
            size={24}
            iconColor="#000000"
            style={[
              styles.sendButton,
              (!inputMessage.trim() || isLoading || isSending) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputMessage.trim() || isLoading || isSending}
            containerColor="#FFFFFF"
            loading={isSending}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    margin: 0,
  },
  headerTitle: {},
  headerSpacer: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: "row",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  assistantMessageContainer: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userMessageBubble: {
    backgroundColor: "#333333",
    borderBottomRightRadius: 4,
  },
  assistantMessageBubble: {
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    lineHeight: 22,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  assistantMessageText: {
    color: "#000000",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingLeft: 4,
  },
  loadingText: {
    marginLeft: 8,
    color: "#666",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  nextStepButton: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    margin: 0,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});
