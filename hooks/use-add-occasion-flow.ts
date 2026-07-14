import { useState } from "react";
import { Alert, View } from "react-native";
import { sanitizeExtractedOccasionDate } from "../utils/occasion-dates";
import { useCreateOccasion } from "./use-occasion-mutations";
import { useConversationFlow, type Message } from "./use-conversation-flow";

interface UseAddOccasionFlowOptions {
  recipientId: string;
  recipientName: string;
  onSuccess: () => void;
}

interface UseAddOccasionFlowReturn {
  messages: Message[];
  isLoading: boolean;
  shouldShowNextStepButton: boolean;
  conversationContext: string;
  messagesEndRef: React.RefObject<View | null>;
  sendMessage: (message: string) => Promise<void>;
  canRetrySend: boolean;
  retryLastSend: () => Promise<void>;
  handleFinishConversation: () => Promise<void>;
  resetConversation: () => void;
}

export function useAddOccasionFlow({
  recipientId,
  recipientName,
  onSuccess,
}: UseAddOccasionFlowOptions): UseAddOccasionFlowReturn {
  const createOccasion = useCreateOccasion();
  const [isSaving, setIsSaving] = useState(false);

  const {
    messages,
    isLoading,
    shouldShowNextStepButton,
    conversationContext,
    messagesEndRef,
    sendMessage,
    canRetrySend,
    retryLastSend,
    handleFinishConversation: genericFinish,
    resetConversation,
  } = useConversationFlow({
    conversationType: "add_occasion",
    existingData: { name: recipientName },
    initialMessage: `What occasion would you like to add for ${recipientName}?`,
  });

  const handleFinishConversation = async () => {
    if (isSaving) return;

    const extracted = await genericFinish();
    if (!extracted?.occasions || extracted.occasions.length === 0) {
      Alert.alert(
        "Error",
        "Could not determine the occasion. Please try again."
      );
      return;
    }

    setIsSaving(true);
    try {
      for (const occasion of extracted.occasions) {
        // AI dates are advisory: known holidays resolve through the lookup,
        // and an unresolvable date is stored as null (undated, editable from
        // the profile) rather than a fabricated placeholder.
        const date = sanitizeExtractedOccasionDate(
          occasion.occasion_type,
          occasion.date
        );

        await createOccasion.mutateAsync({
          recipientId,
          date,
          occasionType: occasion.occasion_type,
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Error creating occasion:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to create occasion. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return {
    messages,
    isLoading: isLoading || isSaving,
    shouldShowNextStepButton,
    conversationContext: conversationContext || "",
    messagesEndRef,
    sendMessage,
    canRetrySend,
    retryLastSend,
    handleFinishConversation,
    resetConversation,
  };
}
