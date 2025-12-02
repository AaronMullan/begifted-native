import { useState, useCallback, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { Alert } from "react-native";
import {
  useConversationFlow,
  Message,
  ExtractedData,
} from "./use-conversation-flow";

interface UseAddRecipientFlowReturn {
  messages: Message[];
  isLoading: boolean;
  extractedData: ExtractedData | null;
  showDataReview: boolean;
  showOccasionsSelection: boolean;
  isSaving: boolean;
  messagesEndRef: React.RefObject<any>;
  shouldShowNextStepButton: boolean;
  conversationContext: string;
  sendMessage: (message: string) => Promise<void>;
  handleNavigateBack: () => void;
  handleFinishConversation: () => Promise<boolean>;
  handleDataReviewContinue: () => Promise<void>;
  handleOccasionsBack: () => void;
  handleOccasionsContinue: (occasions: any[]) => Promise<void>;
  handleOccasionsSkip: () => Promise<void>;
  setShowDataReview: (show: boolean) => void;
  setShowOccasionsSelection: (show: boolean) => void;
  setExtractedData: (data: ExtractedData | null) => void;
}

export function useAddRecipientFlow(userId: string): UseAddRecipientFlowReturn {
  const router = useRouter();
  const [showDataReview, setShowDataReview] = useState(false);
  const [showOccasionsSelection, setShowOccasionsSelection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Use the generic conversation flow hook
  const {
    messages,
    isLoading,
    extractedData,
    shouldShowNextStepButton,
    conversationContext,
    messagesEndRef,
    sendMessage: genericSendMessage,
    handleFinishConversation: genericHandleFinishConversation,
    setExtractedData: genericSetExtractedData,
  } = useConversationFlow({
    conversationType: "add_recipient",
    onExtractSuccess: (data) => {
      // Validate that we have required fields
      if (data.name && data.relationship_type) {
        setShowDataReview(true);
      }
    },
  });

  // Define saveRecipient FIRST so it can be used by other callbacks
  const saveRecipient = useCallback(
    async (data: ExtractedData) => {
      if (!userId) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      setIsSaving(true);

      try {
        // Prepare recipient data
        const recipientData: any = {
          user_id: userId,
          name: data.name!.trim(),
          relationship_type: data.relationship_type!.trim(),
          interests:
            data.interests && data.interests.length > 0 ? data.interests : null,
          birthday: data.birthday?.trim() || null,
          emotional_tone_preference:
            data.emotional_tone_preference?.trim() || null,
          gift_budget_min: data.gift_budget_min || null,
          gift_budget_max: data.gift_budget_max || null,
          address: data.address?.trim() || null,
          address_line_2: data.address_line_2?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null,
          zip_code: data.zip_code?.trim() || null,
          country: data.country?.trim() || "US",
        };

        // Insert recipient
        const { data: recipient, error: recipientError } = await supabase
          .from("recipients")
          .insert([recipientData])
          .select()
          .single();

        if (recipientError) throw recipientError;

        // Create occasions: collect all occasions and ensure birthday is included if it exists
        if (recipient) {
          const occasionsToCreate: Array<{
            user_id: string;
            recipient_id: string;
            date: string;
            occasion_type: string;
          }> = [];

          // Add all occasions from the occasions array
          if (data.occasions && data.occasions.length > 0) {
            data.occasions.forEach((occasion) => {
              occasionsToCreate.push({
                user_id: userId,
                recipient_id: recipient.id,
                date: occasion.date,
                occasion_type: occasion.occasion_type || "custom",
              });
            });
          }

          // If birthday exists, ensure it's added as an occasion (if not already included)
          if (data.birthday) {
            const birthdayParts = data.birthday.trim().split("-");
            if (birthdayParts.length >= 2) {
              const month = parseInt(
                birthdayParts[birthdayParts.length === 3 ? 1 : 0],
                10
              );
              const day = parseInt(
                birthdayParts[birthdayParts.length === 3 ? 2 : 1],
                10
              );

              if (
                !isNaN(month) &&
                !isNaN(day) &&
                month >= 1 &&
                month <= 12 &&
                day >= 1 &&
                day <= 31
              ) {
                // Calculate next occurrence of birthday
                const currentYear = new Date().getFullYear();
                const currentDate = new Date();
                let nextBirthdayDate = new Date(currentYear, month - 1, day);
                if (nextBirthdayDate < currentDate) {
                  nextBirthdayDate = new Date(currentYear + 1, month - 1, day);
                }
                const nextBirthdayDateStr = nextBirthdayDate
                  .toISOString()
                  .split("T")[0];

                // Check if birthday is already in occasions array
                const birthdayAlreadyIncluded = occasionsToCreate.some(
                  (occ) =>
                    occ.occasion_type === "birthday" &&
                    occ.date === nextBirthdayDateStr
                );

                if (!birthdayAlreadyIncluded) {
                  occasionsToCreate.push({
                    user_id: userId,
                    recipient_id: recipient.id,
                    date: nextBirthdayDateStr,
                    occasion_type: "birthday",
                  });
                }
              }
            }
          }

          // Insert all occasions if we have any
          if (occasionsToCreate.length > 0) {
            const { error: occasionsError } = await supabase
              .from("occasions")
              .insert(occasionsToCreate);

            if (occasionsError) {
              console.error("Error creating occasions:", occasionsError);
              // Don't fail the whole operation if occasions fail
            }
          }
        }

        Alert.alert("Success", "Recipient added successfully!", [
          {
            text: "OK",
            onPress: () => {
              router.back();
            },
          },
        ]);
      } catch (error) {
        console.error("Error saving recipient:", error);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to save recipient. Please try again."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [userId, router]
  );

  // Wrap generic sendMessage to maintain interface
  const sendMessage = useCallback(
    async (message: string) => {
      await genericSendMessage(message);
    },
    [genericSendMessage]
  );

  // Wrap generic handleFinishConversation with validation and flow logic
  const handleFinishConversation = useCallback(async (): Promise<boolean> => {
    const extracted = await genericHandleFinishConversation();

    if (extracted && extracted.name && extracted.relationship_type) {
      // Map the extracted data to ensure all fields are properly set
      const mappedData: ExtractedData = {
        name: extracted.name,
        relationship_type: extracted.relationship_type,
        interests: extracted.interests || [],
        birthday: extracted.birthday || undefined,
        emotional_tone_preference:
          extracted.emotional_tone_preference || undefined,
        gift_budget_min: extracted.gift_budget_min || undefined,
        gift_budget_max: extracted.gift_budget_max || undefined,
        address: extracted.address || undefined,
        address_line_2: extracted.address_line_2 || undefined,
        city: extracted.city || undefined,
        state: extracted.state || undefined,
        zip_code: extracted.zip_code || undefined,
        country: extracted.country || "US",
        occasions: extracted.occasions || undefined,
      };

      genericSetExtractedData(mappedData);
      setShowDataReview(true);
      return true;
    }

    return false;
  }, [genericHandleFinishConversation, genericSetExtractedData]);

  const handleDataReviewContinue = useCallback(async () => {
    if (
      !extractedData ||
      !extractedData.name ||
      !extractedData.relationship_type
    ) {
      Alert.alert("Error", "Name and relationship are required");
      return;
    }

    // Check if we need to show occasions selection
    // If birthday exists, we might want to create occasions
    if (extractedData.birthday) {
      setShowOccasionsSelection(true);
    } else {
      // Skip to saving directly
      await saveRecipient(extractedData);
    }
  }, [extractedData, saveRecipient]);

  const handleOccasionsBack = useCallback(() => {
    setShowOccasionsSelection(false);
  }, []);

  const handleOccasionsContinue = useCallback(
    async (occasions: any[]) => {
      if (!extractedData) return;

      const dataWithOccasions = {
        ...extractedData,
        occasions,
      };

      await saveRecipient(dataWithOccasions);
    },
    [extractedData, saveRecipient]
  );

  const handleOccasionsSkip = useCallback(async () => {
    if (!extractedData) return;
    await saveRecipient(extractedData);
  }, [extractedData, saveRecipient]);

  const handleNavigateBack = useCallback(() => {
    router.back();
  }, [router]);

  // Background enrichment of occasions with dates
  useEffect(() => {
    if (extractedData?.occasions && extractedData.occasions.length > 0) {
      // Background process to enrich occasions with dates
      const enrichOccasions = async () => {
        const { lookupOccasionDate } = await import("../utils/occasion-dates");
        const enrichedOccasions = extractedData.occasions!.map((occasion) => {
          // If date is missing or is a placeholder, try to look it up
          if (!occasion.date || occasion.date.includes("01-01")) {
            const lookedUpDate = lookupOccasionDate(occasion.occasion_type);
            if (lookedUpDate) {
              return { ...occasion, date: lookedUpDate };
            }
          }
          return occasion;
        });

        // Only update if we actually enriched any occasions
        const hasChanges = enrichedOccasions.some(
          (occ, idx) => occ.date !== extractedData.occasions![idx].date
        );

        if (hasChanges) {
          genericSetExtractedData({
            ...extractedData,
            occasions: enrichedOccasions,
          });
        }
      };

      enrichOccasions();
    }
  }, [extractedData, genericSetExtractedData]);

  // Wrapper for setExtractedData to maintain interface
  const setExtractedData = useCallback(
    (data: ExtractedData | null) => {
      genericSetExtractedData(data);
    },
    [genericSetExtractedData]
  );

  return {
    messages,
    isLoading,
    extractedData,
    showDataReview,
    showOccasionsSelection,
    isSaving,
    messagesEndRef,
    shouldShowNextStepButton,
    conversationContext: conversationContext || "",
    sendMessage,
    handleNavigateBack,
    handleFinishConversation,
    handleDataReviewContinue,
    handleOccasionsBack,
    handleOccasionsContinue,
    handleOccasionsSkip,
    setShowDataReview,
    setShowOccasionsSelection,
    setExtractedData,
  };
}

// Re-export types for backward compatibility
export type { Message, ExtractedData };
