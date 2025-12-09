import React, { useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/use-auth";
import { useAddRecipientFlow } from "../../hooks/use-add-recipient-flow";
import { ConversationView } from "../../components/recipients/conversation/ConversationView";
import { DataReviewView } from "../../components/recipients/conversation/DataReviewView";
import { OccasionsSelectionView } from "../../components/recipients/conversation/OccasionsSelectionView";
import { ManualDataEntry } from "../../components/recipients/conversation/ManualDataEntry";
import { SuccessView } from "../../components/recipients/conversation/SuccessView";

const AddRecipient = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [partialData, setPartialData] = useState<any>(null);

  // Always call hooks first - use a fallback ID when user is not available
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
  } = useAddRecipientFlow(user?.id || "");

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
        <ActivityIndicator size="large" color="#FFB6C1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Only redirect if not loading and no user
  if (!authLoading && !user) {
    router.replace("/");
    return null;
  }

  // Show success screen when save completes
  if (saveSuccess) {
    return (
      <SuccessView
        recipientName={savedRecipientName || "Recipient"}
        onViewRecipients={handleViewRecipients}
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
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  container: {
    padding: 16,
  },
});

export default AddRecipient;
