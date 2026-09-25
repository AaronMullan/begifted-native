import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import type { NavigationAction } from "@react-navigation/native";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "../../../hooks/use-auth";
import { useRecipients } from "../../../hooks/use-recipients";
import { findExistingRecipient } from "../../../lib/recipient-match";
import type { Recipient } from "../../../types/recipient";
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
import { registerLeaveGuard } from "../../../lib/leave-guard";
import {
  clearPendingContactQueue,
  peekPendingContactQueue,
} from "../../../lib/pending-contact-queue";
import {
  clearAddRecipientDraft,
  peekAddRecipientDraft,
} from "../../../lib/add-recipient-draft";
import type { AddRecipientDraftSeed } from "../../../lib/add-recipient-draft";
import { Spacing } from "../../../lib/spacing";
import GradientBackground from "../../../components/GradientBackground";

const AddRecipient = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{
    name?: string;
    birthday?: string;
    anniversary?: string;
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
  const [addedCount, setAddedCount] = useState(0);
  const [confirmStopVisible, setConfirmStopVisible] = useState(false);
  const pendingLeaveAction = useRef<NavigationAction | null>(null);
  const pendingLeaveHref = useRef<string | null>(null);
  const allowLeave = useRef(false);

  // Capture device-contact prefill once at mount.
  const [paramSeed] = useState<AddRecipientDraftSeed>(() => ({
    name: typeof params.name === "string" ? params.name : undefined,
    birthday: typeof params.birthday === "string" ? params.birthday : undefined,
    anniversary:
      typeof params.anniversary === "string" ? params.anniversary : undefined,
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

  // beforeRemove only sees stack pops. The BottomNav/Header Links dispatch a
  // tab switch (or an unpreventable pop for the People tab) that skips it, so
  // they consult this guard before following the link.
  useEffect(() => {
    if (!queue) return;
    return registerLeaveGuard((href) => {
      if (allowLeave.current) return false;
      // Auth lost: the flow is already redirecting to "/"; blocking a nav tap
      // here would show the stop dialog over a dead flow.
      if (!authLoading && !user) return false;
      pendingLeaveHref.current = href;
      setConfirmStopVisible(true);
      return true;
    });
  }, [queue, user, authLoading]);

  if (!queue) {
    return (
      <View style={styles.queueContainer}>
        <GradientBackground />
        <AddRecipientFlow seed={paramSeed} />
      </View>
    );
  }

  const total = queue.length;
  const remaining = total - queueIndex;

  const advanceQueue = (added: number) => {
    if (queueIndex + 1 < total) {
      setQueueIndex(queueIndex + 1);
      return;
    }
    allowLeave.current = true;
    showSnackbar(
      added === 0
        ? "No one new was added."
        : `${added} ${added === 1 ? "person" : "people"} added`
    );
    router.replace("/contacts");
  };

  const handleRecipientSaved = () => {
    setAddedCount(addedCount + 1);
    advanceQueue(addedCount + 1);
  };

  const handleRecipientSkipped = () => advanceQueue(addedCount);

  const handleKeepAdding = () => {
    pendingLeaveAction.current = null;
    pendingLeaveHref.current = null;
    setConfirmStopVisible(false);
  };

  const handleStop = () => {
    setConfirmStopVisible(false);
    allowLeave.current = true;
    const action = pendingLeaveAction.current;
    const href = pendingLeaveHref.current;
    pendingLeaveAction.current = null;
    pendingLeaveHref.current = null;
    if (action) {
      navigation.dispatch(action);
      return;
    }
    // Replace first so this screen leaves the contacts stack — a bare tab
    // switch would keep the dead queue mounted and show it on the next visit
    // to People.
    router.replace("/contacts");
    if (href && href !== "/contacts") {
      router.navigate(href as Parameters<typeof router.navigate>[0]);
    }
  };

  return (
    <View style={styles.queueContainer}>
      <GradientBackground />
      <Text style={styles.progressLabel}>
        {queueIndex + 1} of {total}
      </Text>
      <AddRecipientFlow
        key={queueIndex}
        seed={queue[queueIndex]}
        onSaved={handleRecipientSaved}
        onSkip={handleRecipientSkipped}
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
              {addedCount} of {total} {addedCount === 1 ? "has" : "have"} been
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
  seed: AddRecipientDraftSeed;
  /** Batch mode: called once after this recipient saves; suppresses the
   * profile-ready interstitial so the queue advances directly. */
  onSaved?: () => void;
  /** Batch mode: called instead of onSaved when this contact is skipped as
   * someone the user already has. */
  onSkip?: () => void;
};

// Auth gate above the flow: the resume decision below reads the parked draft
// once, in a state initializer on first render — so the flow must not mount
// until the user is known (useAuth resolves the session asynchronously, and a
// null-user first render would silently decide "no draft" every time).
const AddRecipientFlow = ({ seed, onSaved, onSkip }: AddRecipientFlowProps) => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  // Bumped by "Start fresh": remounting the inner flow discards the restored
  // conversation and re-runs the resume decision against the cleared store.
  const [flowKey, setFlowKey] = useState(0);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.black} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    router.replace("/");
    return null;
  }

  return (
    <AddRecipientFlowInner
      key={flowKey}
      user={user}
      seed={seed}
      onSaved={onSaved}
      onSkip={onSkip}
      onStartFresh={() => {
        clearAddRecipientDraft();
        setFlowKey((k) => k + 1);
      }}
    />
  );
};

const AddRecipientFlowInner = ({
  user,
  seed,
  onSaved,
  onSkip,
  onStartFresh,
}: AddRecipientFlowProps & { user: User; onStartFresh: () => void }) => {
  const router = useRouter();
  const { data: recipients } = useRecipients();
  const [showManualEntry, setShowManualEntry] = useState(false);
  // Existing people the user chose to add again anyway — never re-ask.
  const [dismissedMatchIds, setDismissedMatchIds] = useState<string[]>([]);
  const [reviewMatch, setReviewMatch] = useState<Recipient | null>(null);
  const [partialData, setPartialData] = useState<any>(null);
  const savedNotified = useRef(false);

  // Any prefilled field marks seeded intent — device contacts can lack a name
  // (phone/email only), and such an import must still start fresh rather than
  // hijack-resume an unrelated parked draft.
  const seedHasContent = !!(
    seed.name ||
    seed.note ||
    seed.birthday ||
    seed.anniversary ||
    seed.photoUri ||
    Object.keys(seed.address).length > 0
  );

  // Resume an abandoned flow only on a bare "+ Add person" entry. A seeded
  // entry (contact import, Moments note) is an explicit new-person intent, and
  // batch mode advances a queue — both start fresh. Read once at mount: the
  // draft keeps updating as this flow runs, so re-reading would loop state
  // back into itself.
  const [resume] = useState(() => {
    if (onSaved || seedHasContent) return null;
    return peekAddRecipientDraft(user.id);
  });
  const effectiveSeed = resume?.seed ?? seed;

  // A seeded solo entry supersedes whatever was parked — clear it up front so
  // an immediately-abandoned seeded flow can't resurrect the older draft.
  useEffect(() => {
    if (!onSaved && seedHasContent) clearAddRecipientDraft();
  }, [onSaved, seedHasContent]);

  useEffect(() => {
    if (resume) {
      showSnackbar("Picking up where you left off.", {
        label: "Start fresh",
        onPress: onStartFresh,
      });
    }
  }, [resume, onStartFresh]);

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
    user.id,
    effectiveSeed.name,
    Object.keys(effectiveSeed.address).length > 0
      ? effectiveSeed.address
      : undefined,
    effectiveSeed.birthday,
    effectiveSeed.photoUri,
    effectiveSeed.note,
    effectiveSeed.anniversary,
    { resume, persist: !onSaved }
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

  // An imported contact's name is known before the conversation starts, so
  // check it while the chat is up. Gated off during and after a save: the
  // save refetches recipients, and the new row would match its own seed.
  const onConversation =
    !showDataReview && !showOccasionsSelection && !showManualEntry;
  const seedMatch =
    recipients && onConversation && !isSaving && !saveSuccess
      ? findExistingRecipient(effectiveSeed.name, recipients, dismissedMatchIds)
      : null;
  const duplicateMatch = reviewMatch ?? seedMatch;

  // A typed name is only known once extraction lands, so the last check sits
  // on Data Review's continue — before any row is written.
  const handleReviewContinue = async () => {
    const match = recipients
      ? findExistingRecipient(
          extractedData?.name,
          recipients,
          dismissedMatchIds
        )
      : null;
    if (match) {
      setReviewMatch(match);
      return;
    }
    await handleDataReviewContinue();
  };

  const handleAddAnyway = () => {
    if (!duplicateMatch) return;
    setDismissedMatchIds([...dismissedMatchIds, duplicateMatch.id]);
    if (reviewMatch) {
      setReviewMatch(null);
      handleDataReviewContinue();
    }
  };

  const handleOpenExisting = () => {
    if (!duplicateMatch) return;
    clearAddRecipientDraft();
    router.replace(`/contacts/${duplicateMatch.id}`);
  };

  const duplicateDialog = (
    <Portal>
      <Dialog
        visible={!!duplicateMatch}
        dismissable={false}
        style={{ borderRadius: 16 }}
      >
        <Dialog.Title>You already have {duplicateMatch?.name}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            Adding them again starts a second profile, and their gifts and
            moments would be split between the two.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleAddAnyway}>Add anyway</Button>
          {onSkip ? (
            <Button onPress={onSkip}>Skip</Button>
          ) : (
            <Button onPress={handleOpenExisting}>
              Open {duplicateMatch?.name.trim().split(/\s+/)[0]}
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

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
      <>
        <DataReviewView
          extractedData={extractedData}
          isSaving={isSaving}
          onBack={() => setShowDataReview(false)}
          onDataChange={setExtractedData}
          onSave={handleReviewContinue}
        />
        {duplicateDialog}
      </>
    );
  }

  return (
    <>
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
      {duplicateDialog}
    </>
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
