import { useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../../hooks/use-auth";
import { Typography } from "../../../lib/typography";
import { Colors } from "../../../lib/colors";
import { useAddRecipientFlow } from "../../../hooks/use-add-recipient-flow";
import { ConversationView } from "../../../components/recipients/conversation/ConversationView";
import AddRecipientLegalNotice from "../../../components/recipients/AddRecipientLegalNotice";
import { DataReviewView } from "../../../components/recipients/conversation/DataReviewView";
import { OccasionsSelectionView } from "../../../components/recipients/conversation/OccasionsSelectionView";
import { ManualDataEntry } from "../../../components/recipients/conversation/ManualDataEntry";
import { ProfileReadyInterstitial } from "../../../components/ProfileReadyInterstitial";
import { formatShortName } from "../../../lib/format-name";
import type { ExtractedData } from "../../../hooks/use-conversation-flow";
import { Spacing } from "../../../lib/spacing";

type InitialContactSeed = {
  name?: string;
  birthday?: string;
  photoUri?: string;
  address: Partial<
    Pick<ExtractedData, "address" | "city" | "state" | "zip_code" | "country">
  >;
};

const AddRecipient = () => {
  const params = useLocalSearchParams<{
    name?: string;
    birthday?: string;
    address?: string;
    city?: string;
    region?: string;
    zip_code?: string;
    country?: string;
    photo_url?: string;
  }>();

  // Capture device-contact prefill once at mount.
  const [seed] = useState<InitialContactSeed>(() => ({
    name: typeof params.name === "string" ? params.name : undefined,
    birthday: typeof params.birthday === "string" ? params.birthday : undefined,
    photoUri:
      typeof params.photo_url === "string" ? params.photo_url : undefined,
    address: {
      ...(typeof params.address === "string" && { address: params.address }),
      ...(typeof params.city === "string" && { city: params.city }),
      ...(typeof params.region === "string" && { state: params.region }),
      ...(typeof params.zip_code === "string" && { zip_code: params.zip_code }),
      ...(typeof params.country === "string" && { country: params.country }),
    },
  }));

  return <AddRecipientFlow seed={seed} />;
};

type AddRecipientFlowProps = {
  seed: InitialContactSeed;
};

const AddRecipientFlow = ({ seed }: AddRecipientFlowProps) => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [partialData, setPartialData] = useState<any>(null);

  const {
    messages,
    isLoading,
    extractedData,
    showDataReview,
    showOccasionsSelection,
    isSaving,
    saveSuccess,
    savedRecipientName,
    messagesEndRef,
    shouldShowNextStepButton,
    conversationContext,
    sendMessage,
    canRetrySend,
    retryLastSend,
    handleNavigateBack,
    handleFinishConversation,
    handleDataReviewContinue,
    handleOccasionsBack,
    handleOccasionsContinue,
    handleOccasionsSkip,
    handleViewRecipients,
    setShowDataReview,
    setExtractedData,
  } = useAddRecipientFlow(
    user?.id || "",
    seed.name,
    Object.keys(seed.address).length > 0 ? seed.address : undefined,
    seed.birthday,
    seed.photoUri
  );

  // Enhanced finish conversation handler with proper error handling
  const handleFinishConversationWithFallback = async () => {
    console.log("Starting conversation finish with proper state management");
    try {
      const result = await handleFinishConversation();

      // Check the actual result - if extraction was successful, data review should already be showing
      // If not successful and we need manual entry, the hook should handle this
      if (
        !result &&
        (!extractedData ||
          !extractedData.name ||
          !extractedData.relationship_type)
      ) {
        console.log("Data extraction incomplete, showing manual entry");
        setPartialData(extractedData);
        setShowManualEntry(true);
      }
    } catch (error) {
      console.error("Error in handleFinishConversation:", error);
      // Only show manual entry on actual errors
      setPartialData(extractedData);
      setShowManualEntry(true);
    }
  };

  const handleManualEntryComplete = (completeData: any) => {
    console.log("Manual entry completed with data:", completeData);
    setExtractedData(completeData);
    setShowManualEntry(false);
    setShowDataReview(true);
  };

  const handleManualEntryCancel = () => {
    setShowManualEntry(false);
    setPartialData(null);
  };

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.black} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Only redirect if not loading and no user
  if (!authLoading && !user) {
    router.replace("/");
    return null;
  }

  // Save complete → the "profile is ready" transition (Figma 5051:7621);
  // auto-advances to the new person's gift ideas, no CTA.
  if (saveSuccess) {
    const shortName = formatShortName(savedRecipientName || "Recipient");
    const possessive = shortName.endsWith("s")
      ? `${shortName}'`
      : `${shortName}'s`;
    return (
      <ProfileReadyInterstitial
        title={`${possessive} profile is ready`}
        subtitle="We'll start finding thoughtful gift ideas for them. You can always add more later."
        onDone={handleViewRecipients}
      />
    );
  }

  if (showManualEntry) {
    return (
      <View style={styles.container}>
        <ManualDataEntry
          partialData={partialData}
          onComplete={handleManualEntryComplete}
          onCancel={handleManualEntryCancel}
        />
      </View>
    );
  }

  if (showOccasionsSelection && extractedData) {
    return (
      <OccasionsSelectionView
        extractedData={extractedData}
        onBack={handleOccasionsBack}
        onContinue={handleOccasionsContinue}
        onSkip={handleOccasionsSkip}
      />
    );
  }

  if (showDataReview && extractedData) {
    return (
      <DataReviewView
        extractedData={extractedData}
        isSaving={isSaving}
        onBack={() => setShowDataReview(false)}
        onDataChange={setExtractedData}
        onSave={handleDataReviewContinue}
      />
    );
  }

  return (
    <ConversationView
      messages={messages}
      isLoading={isLoading}
      messagesEndRef={messagesEndRef}
      onNavigateBack={handleNavigateBack}
      onSendMessage={sendMessage}
      onFinishConversation={handleFinishConversationWithFallback}
      shouldShowNextStepButton={shouldShowNextStepButton}
      conversationContext={conversationContext}
      canRetry={canRetrySend}
      onRetry={retryLastSend}
      headerNotice={<AddRecipientLegalNotice />}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  loadingText: {
    marginTop: 16,
    ...Typography.subhead,
    color: Colors.grays.text,
  },
  container: {
    padding: Spacing.marginStandard,
  },
});

export default AddRecipient;
