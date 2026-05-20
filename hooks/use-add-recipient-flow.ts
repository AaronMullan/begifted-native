import * as Haptics from "expo-haptics";
import * as Sentry from "@sentry/react-native";
import * as FileSystem from "expo-file-system/legacy";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, View } from "react-native";
import { queryKeys } from "../lib/query-keys";
import { supabase } from "../lib/supabase";
import { normalizeBirthday } from "../utils/birthday";
import {
  ExtractedData,
  Message,
  useConversationFlow,
} from "./use-conversation-flow";

// Direct supabase.storage.upload calls to `recipient-photos` get RLS-rejected
// on this project even with permissive policies — likely a storage-api/plpgsql
// plan cache issue we cannot fix from the client. Route through an edge
// function (`upload-recipient-photo`) that uses service_role to do the upload,
// while enforcing path scoping to the authenticated caller's user_id.
async function uploadRecipientPhoto(
  photoUri: string
): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const { data, error } = await supabase.functions.invoke<{
      publicUrl?: string;
      error?: string;
    }>("upload-recipient-photo", {
      body: { base64, contentType: "image/jpeg" },
    });
    if (error || !data?.publicUrl) {
      const message = error?.message ?? data?.error ?? "Upload failed";
      console.error("[photo] upload error:", message);
      Sentry.captureException(new Error(message), {
        tags: { flow: "add_recipient", step: "photo_upload" },
      });
      return null;
    }
    return data.publicUrl;
  } catch (err) {
    console.error("[photo] upload failed:", err);
    Sentry.captureException(err, {
      tags: { flow: "add_recipient", step: "photo_upload" },
    });
    return null;
  }
}

interface UseAddRecipientFlowReturn {
  messages: Message[];
  isLoading: boolean;
  extractedData: ExtractedData | null;
  showDataReview: boolean;
  showOccasionsSelection: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  savedRecipientName: string | null;
  savedRecipientId: string | null;
  messagesEndRef: React.RefObject<View | null>;
  shouldShowNextStepButton: boolean;
  conversationContext: string;
  sendMessage: (message: string) => Promise<void>;
  handleNavigateBack: () => void;
  handleFinishConversation: () => Promise<boolean>;
  handleDataReviewContinue: () => Promise<void>;
  handleOccasionsBack: () => void;
  handleOccasionsContinue: (occasions: NonNullable<ExtractedData["occasions"]>) => Promise<void>;
  handleOccasionsSkip: () => Promise<void>;
  handleViewRecipients: () => void;
  setShowDataReview: (show: boolean) => void;
  setShowOccasionsSelection: (show: boolean) => void;
  setExtractedData: (data: ExtractedData | null) => void;
}

export function useAddRecipientFlow(
  userId: string,
  initialContactName?: string,
  initialAddress?: Partial<
    Pick<ExtractedData, "address" | "city" | "state" | "zip_code" | "country">
  >,
  initialBirthday?: string,
  initialPhotoUri?: string
): UseAddRecipientFlowReturn {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Stable cached copy of the contact photo — expo-contacts temp files are cleaned up by iOS
  const cachedPhotoUri = useRef<string | null>(initialPhotoUri ?? null);
  const [showDataReview, setShowDataReview] = useState(false);
  const [showOccasionsSelection, setShowOccasionsSelection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedRecipientName, setSavedRecipientName] = useState<string | null>(null);
  const [savedRecipientId, setSavedRecipientId] = useState<string | null>(null);

  useEffect(() => {
    Sentry.captureMessage("add_recipient_flow_hook_init", {
      level: "info",
      tags: {
        flow: "add_recipient",
        step: "hook_init",
        has_initial_photo_uri: initialPhotoUri ? "yes" : "no",
      },
    });
    if (!initialPhotoUri) return;
    const dest = `${FileSystem.cacheDirectory}contact-photo-${Date.now()}.jpg`;
    FileSystem.copyAsync({ from: initialPhotoUri, to: dest })
      .then(() => {
        cachedPhotoUri.current = dest;
      })
      .catch((err) => {
        console.error("[photo] hook cache copy failed:", err);
        Sentry.captureException(err, {
          tags: {
            flow: "add_recipient",
            step: "hook_recache",
          },
        });
      });
  }, []);

  const initialUserMessage = initialContactName?.trim()
    ? `I'd like to add ${initialContactName.trim()}`
    : undefined;

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
    initialUserMessage,
    onExtractSuccess: (data) => {
      // Validate that we have required fields
      if (data.name && data.relationship_type) {
        const merged = { ...data };
        // Pre-fill birthday from device contact if not already extracted
        if (!merged.birthday && initialBirthday) {
          merged.birthday = initialBirthday;
        }
        // Pre-fill address from device contact if not already extracted
        if (initialAddress) {
          if (!merged.address && initialAddress.address)
            merged.address = initialAddress.address;
          if (!merged.city && initialAddress.city)
            merged.city = initialAddress.city;
          if (!merged.state && initialAddress.state)
            merged.state = initialAddress.state;
          if (!merged.zip_code && initialAddress.zip_code)
            merged.zip_code = initialAddress.zip_code;
          if (!merged.country && initialAddress.country)
            merged.country = initialAddress.country;
        }
        if (initialAddress || initialBirthday) {
          genericSetExtractedData(merged);
        }
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
        const photoUri = cachedPhotoUri.current;
        if (!photoUri) {
          Sentry.captureMessage("photo_skipped_at_save", {
            level: "info",
            tags: {
              flow: "add_recipient",
              step: "photo_skip",
            },
          });
        }
        const photoUrl = photoUri
          ? await uploadRecipientPhoto(photoUri)
          : null;

        // Prepare recipient data
        const recipientData = {
          user_id: userId,
          name: data.name!.trim(),
          relationship_type: data.relationship_type!.trim(),
          interests:
            data.interests && data.interests.length > 0 ? data.interests : null,
          birthday: normalizeBirthday(data.birthday),
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
          photo_url: photoUrl,
        };

        // Insert recipient
        const { data: recipient, error: recipientError } = await supabase
          .from("recipients")
          .insert([recipientData])
          .select()
          .single();

        if (recipientError) throw recipientError;

        // Create occasions if provided (includes birthday if it was extracted as an occasion)
        if (data.occasions && data.occasions.length > 0 && recipient) {
          const occasionsData = data.occasions.map((occasion) => ({
            user_id: userId,
            recipient_id: recipient.id,
            date: occasion.date,
            occasion_type: occasion.occasion_type || "custom",
          }));

          const { error: occasionsError } = await supabase
            .from("occasions")
            .insert(occasionsData);

          if (occasionsError) {
            console.error("Error creating occasions:", occasionsError);
            // Don't fail the whole operation if occasions fail
          }
        }

        // Invalidate cache so dashboard, contacts, and calendar show the new recipient
        await queryClient.invalidateQueries({
          queryKey: queryKeys.recipients(userId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.occasions(userId),
        });

        // Trigger success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Show success immediately — background work happens after
        setSavedRecipientName(data.name || "Recipient");
        setSavedRecipientId(recipient.id);
        setSaveSuccess(true);

        // Fire-and-forget: synthesize-recipient-profile runs on the server,
        // chains to gift generation itself (which honors the kill switch),
        // and updates the DB. We dispatch the request and return immediately
        // so iOS can't kill the JS task before the long server-side chain
        // (synthesis + gift gen ~60s) finishes.
        if (recipient?.id) {
          supabase.functions
            .invoke("synthesize-recipient-profile", {
              body: { recipientId: recipient.id },
            })
            .catch((err) => {
              console.error("Failed to trigger profile synthesis:", err);
              Sentry.captureException(err, {
                tags: {
                  flow: "add_recipient",
                  step: "synthesize_profile",
                  edge_function: "synthesize-recipient-profile",
                },
              });
            });
        }
      } catch (error) {
        console.error("Error saving recipient:", error);
        Sentry.captureException(error, {
          tags: { flow: "add_recipient", step: "save" },
        });
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
    [userId, router, queryClient, cachedPhotoUri]
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
        birthday: extracted.birthday || initialBirthday || undefined,
        emotional_tone_preference:
          extracted.emotional_tone_preference || undefined,
        gift_budget_min: extracted.gift_budget_min || undefined,
        gift_budget_max: extracted.gift_budget_max || undefined,
        address: extracted.address || initialAddress?.address || undefined,
        address_line_2: extracted.address_line_2 || undefined,
        city: extracted.city || initialAddress?.city || undefined,
        state: extracted.state || initialAddress?.state || undefined,
        zip_code: extracted.zip_code || initialAddress?.zip_code || undefined,
        country: extracted.country || initialAddress?.country || "US",
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

    // Always show occasions selection so users can add birthday,
    // holidays, and other occasions even if birthday wasn't extracted
    setShowOccasionsSelection(true);
  }, [extractedData, saveRecipient]);

  const handleOccasionsBack = useCallback(() => {
    setShowOccasionsSelection(false);
  }, []);

  const handleOccasionsContinue = useCallback(
    async (occasions: NonNullable<ExtractedData["occasions"]>) => {
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

  const handleViewRecipients = useCallback(() => {
    if (savedRecipientId) {
      router.replace(`/contacts/${savedRecipientId}?tab=gifts&generating=true`);
    } else {
      router.replace("/contacts");
    }
  }, [router, savedRecipientId]);

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
    saveSuccess,
    savedRecipientName,
    savedRecipientId,
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
    handleViewRecipients,
    setShowDataReview,
    setShowOccasionsSelection,
    setExtractedData,
  };
}

// Re-export types for backward compatibility
export type { ExtractedData, Message };
