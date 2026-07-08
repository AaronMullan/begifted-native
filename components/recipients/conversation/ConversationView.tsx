import React, { useState, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Keyboard,
  Platform,
  Animated,
} from "react-native";
import {
  Text,
  TextInput,
  IconButton,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import { Message } from "@/hooks/use-add-recipient-flow";
import { BOTTOM_NAV_HEIGHT } from "@/lib/constants";
import { Colors } from "@/lib/colors";
import { Typography } from "@/lib/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ConversationViewProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<View | null>;
  onNavigateBack: () => void;
  onSendMessage: (message: string) => Promise<void>;
  onFinishConversation: () => Promise<void>;
  shouldShowNextStepButton: boolean;
  conversationContext: string;
  /** True when the last send failed and a manual retry is available. */
  canRetry?: boolean;
  /** Re-send the last failed turn. */
  onRetry?: () => Promise<void> | void;
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
  canRetry = false,
  onRetry,
  title = "Add Recipient",
  finishButtonLabel = "Let's Move to the Next Step",
}: ConversationViewProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  // Lazy state init (not useRef().current) keeps the Animated.Value stable
  // without reading a ref during render, which react-hooks/refs forbids.
  const [keyboardOffset] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  const inputBottomPadding = isKeyboardVisible
    ? Math.max(insets.bottom, 8)
    : BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      setIsKeyboardVisible(false);
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    <Animated.View
      style={[styles.container, { paddingBottom: keyboardOffset }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor={Colors.black}
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
        keyboardShouldPersistTaps="handled"
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
      <View
        style={[styles.inputContainer, { paddingBottom: inputBottomPadding }]}
      >
        {canRetry && onRetry && !isLoading && (
          <Button
            mode="outlined"
            icon="refresh"
            onPress={onRetry}
            disabled={isSending}
            style={styles.retryButton}
          >
            Try again
          </Button>
        )}

        {shouldShowNextStepButton && (
          <Button
            mode="contained"
            buttonColor={Colors.black}
            onPress={onFinishConversation}
            disabled={isLoading || isSending}
            style={styles.nextStepButton}
          >
            {finishButtonLabel}
          </Button>
        )}

        <View style={styles.inputRow}>
          <TextInput
            mode="flat"
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Type your message..."
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
            multiline
            editable={!isLoading && !isSending}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            placeholderTextColor={Colors.grays.placeholder}
            underlineColor={Colors.transparent}
            activeUnderlineColor={Colors.transparent}
            dense
            style={styles.textInput}
            contentStyle={styles.textInputContent}
          />
          <IconButton
            icon="send"
            size={24}
            iconColor={Colors.black}
            style={[
              styles.sendButton,
              (!inputMessage.trim() || isLoading || isSending) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputMessage.trim() || isLoading || isSending}
            containerColor={Colors.white}
            loading={isSending}
          />
        </View>
      </View>
    </Animated.View>
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
  // 44pt min tap target (HIG); transparent container, 24pt icon unchanged.
  backButton: {
    margin: 0,
    width: 44,
    height: 44,
  },
  headerTitle: {},
  // Matches backButton width so the title stays centered.
  headerSpacer: {
    width: 44,
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
    backgroundColor: Colors.grays.dark,
    borderBottomRightRadius: 4,
  },
  assistantMessageBubble: {
    backgroundColor: Colors.grays.hairline,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.white,
  },
  assistantMessageText: {
    color: Colors.black,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingLeft: 4,
  },
  loadingText: {
    marginLeft: 8,
    color: Colors.grays.text,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  nextStepButton: {
    marginBottom: 12,
  },
  retryButton: {
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.grays.field,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    ...Typography.subhead,
    maxHeight: 120,
  },
  textInputContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButton: {
    margin: 0,
    borderWidth: 1,
    borderColor: Colors.grays.border,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});
