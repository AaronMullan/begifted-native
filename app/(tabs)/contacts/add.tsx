import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import type { NavigationAction } from "@react-navigation/native";
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
import { showSnackbar } from "../../../components/GlobalSnackbar";
import { formatShortName } from "../../../lib/format-name";
import {
  clearPendingContactQueue,
  peekPendingContactQueue,
} from "../../../lib/pending-contact-queue";
import type { PendingContactSeed } from "../../../lib/pending-contact-queue";
import { Spacing } from "../../../lib/spacing";

type InitialContactSeed = PendingContactSeed & {
  /** A free-form note (Moments "Tell BeGifted about them" drawer) sent as the
   * first conversation message so extraction runs on it immediately. */
  note?: string;
};

const AddRecipient = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{
    name?: string;
    birthday?: string;
    address?: string;
    city?: string;
    region?: string;
    zip_code?: string;
    country?: string;
    photo_url?: string;
    initialNote?: string;
  }>();

  // A multi-select contact import parks its queue in module memory right
  // before navigating here. Peek in the initializer (it must stay pure —
  // StrictMode/concurrent React can replay it) and claim in the effect below.
  const [queue] = useState(() => peekPendingContactQueue());
  const [queueIndex, setQueueIndex] = useState(0);
  const [confirmStopVisible, setConfirmStopVisible] = useState(false);
  const pendingLeaveAction = useRef<NavigationAction | null>(null);
  const allowLeave = useRef(false);

  // Capture device-contact prefill once at mount.
  const [paramSeed] = useState<InitialContactSeed>(() => ({
    name: typeof params.name === "string" ? params.name : undefined,
    birthday: typeof params.birthday === "string" ? params.birthday : undefined,
    photoUri:
      typeof params.photo_url === "string" ? params.photo_url : undefined,
    note:
      typeof params.initialNote === "string" ? params.initialNote : undefined,
    address: {
      ...(typeof params.address === "string" && { address: params.address }),
      ...(typeof params.city === "string" && { city: params.city }),
      ...(typeof params.region === "string" && { state: params.region }),
      ...(typeof params.zip_code === "string" && { zip_code: params.zip_code }),
      ...(typeof params.country === "string" && { country: params.country }),
    },
  }));

  // Claim the queue once mounted so a later visit can't replay the batch.
  useEffect(() => {
    if (queue) clearPendingContactQueue();
  }, [queue]);

  // Leaving mid-queue must be deliberate: pending contacts silently vanish
  // (they were never written to the DB), so intercept any removal — back
  // button, gesture, tab pop — and confirm first. When auth is lost the
  // flow's redirect to "/" must pass through, or the dialog would trap the
  // user in a reopen loop over a dead flow.
  useEffect(() => {
    if (!queue) return;
    return navigation.addListener("beforeRemove", (e) => {
      if (allowLeave.current) return;
      if (!authLoading && !user) return;
      e.preventDefault();
      pendingLeaveAction.current = e.data.action;
      setConfirmStopVisible(true);
    });
  }, [navigation, queue, user, authLoading]);

  if (!queue) {
    return <AddRecipientFlow seed={paramSeed} />;
  }

  const total = queue.length;
  const completed = queueIndex;
  const remaining = total - completed;

  const handleRecipientSaved = () => {
    if (queueIndex + 1 < total) {
      setQueueIndex(queueIndex + 1);
      return;
    }
    allowLeave.current = true;
    showSnackbar(`${total} people added`);
    router.replace("/contacts");
  };

  const handleKeepAdding = () => {
    pendingLeaveAction.current = null;
    setConfirmStopVisible(false);
  };

  const handleStop = () => {
    setConfirmStopVisible(false);
    allowLeave.current = true;
    const action = pendingLeaveAction.current;
    if (action) {
      navigation.dispatch(action);
    } else {
      router.replace("/contacts");
    }
  };

  return (
    <View style={styles.queueContainer}>
      <Text style={styles.progressLabel}>
        {queueIndex + 1} of {total}
      </Text>
      <AddRecipientFlow
        key={queueIndex}
        seed={queue[queueIndex]}
        onSaved={handleRecipientSaved}
      />
      <Portal>
        <Dialog
          visible={confirmStopVisible}
          onDismiss={handleKeepAdding}
          style={{ borderRadius: 16 }}
        >
          <Dialog.Title>Stop adding people?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {completed} of {total} {completed === 1 ? "has" : "have"} been
              added.{" "}
              {remaining === 1
                ? "The remaining person"
                : `The remaining ${remaining}`}{" "}
              won&apos;t be added.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleKeepAdding}>Keep Adding</Button>
            <Button onPress={handleStop}>Stop</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

type AddRecipientFlowProps = {
  seed: InitialContactSeed;
  /** Batch mode: called once after this recipient saves; suppresses the
   * profile-ready interstitial so the queue advances directly. */
  onSaved?: () => void;
};

const AddRecipientFlow = ({ seed, onSaved }: AddRecipientFlowProps) => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [partialData, setPartialData] = useState<any>(null);
  const savedNotified = useRef(false);

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
    seed.photoUri,
    seed.note
  );

  // saveSuccess flips exactly once per mounted flow (the queue remounts via
  // key), but the ref still guards against re-runs from a changing onSaved
  // identity — advancing twice would skip a queued person.
  useEffect(() => {
    if (!saveSuccess || !onSaved || savedNotified.current) return;
    savedNotified.current = true;
    onSaved();
  }, [saveSuccess, onSaved]);

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
    // Batch mode skips the interstitial: the parent advances the queue (or
    // returns to People) as soon as the save lands.
    if (onSaved) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.black} />
        </View>
      );
    }
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
  queueContainer: {
    flex: 1,
  },
  progressLabel: {
    ...Typography.body13,
    color: Colors.grays.text,
    textAlign: "center",
    paddingTop: 8,
  },
});

export default AddRecipient;
