import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Button, Dialog, IconButton, Portal } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useRouter, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { queryKeys } from "../../../lib/query-keys";
import { BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import type { Recipient, GiftSuggestion } from "../../../types/recipient";
import { AboutRecipientView } from "../../../components/recipients/AboutRecipientView";
import GiftSuggestionsList from "../../../components/gifts/GiftSuggestionsList";
import PastGiftsSection from "../../../components/gifts/PastGiftsSection";
import { useAuth } from "../../../hooks/use-auth";
import { useRecipient } from "../../../hooks/use-recipient";
import { useOccasion } from "../../../hooks/use-occasion";
import { useGiftSuggestions } from "../../../hooks/use-gift-suggestions";
import { useDeleteRecipient } from "../../../hooks/use-recipient-mutations";
import { ConversationView } from "../../../components/recipients/conversation/ConversationView";
import { useAddOccasionFlow } from "../../../hooks/use-add-occasion-flow";
import { useConversationFlow } from "../../../hooks/use-conversation-flow";
import { useUserPreferences } from "../../../hooks/use-user-preferences";
import { formatShortName } from "../../../lib/format-name";
import { useToast } from "../../../hooks/use-toast";
import {
  backfillBirthdayFromAge,
  normalizeBirthday,
} from "../../../utils/birthday";
import { formatOccasionType } from "../../../utils/home-occasions";
import { formatOccasionDate } from "../../../utils/occasion-dates";

// Apply an interests delta from an update conversation to the current list:
// keep what's there, drop the removed ones, append the newly-liked ones —
// case-insensitive, order-preserving. Reconciling (rather than overwriting with
// the extractor's freshly-mentioned interests) is what prevents an update like
// "she likes jewelry" from wiping everything else we know (DEV-119).
function reconcileInterests(
  current: string[],
  added: string[],
  removed: string[]
): string[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const removedSet = new Set(
    removed.filter((i): i is string => typeof i === "string").map(norm)
  );
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of [...current, ...added]) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    const key = norm(value);
    if (!value || removedSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
  }
  return merged;
}

// Insert occasions captured by the general "Update what we know" chat into the
// occasions table, de-duplicating against the recipient's existing occasions by
// (date, type) so re-mentioning one never creates a copy. Returns the number of
// rows inserted. Swallows its own errors (logging them) so a failed occasion
// write never fails the surrounding profile update (DEV-125).
async function persistUpdateChatOccasions(
  userId: string,
  recipientId: string,
  occasions: { date: string; occasion_type: string }[]
): Promise<number> {
  const candidates = occasions.filter((o) => o && o.date);
  if (candidates.length === 0) return 0;

  const occasionKey = (date: string, type: string) =>
    `${date}::${(type || "custom").toLowerCase()}`;

  try {
    const { data: existing } = await supabase
      .from("occasions")
      .select("date, occasion_type")
      .eq("recipient_id", recipientId)
      .eq("user_id", userId);

    const seen = new Set(
      (existing ?? []).map((o) =>
        occasionKey(o.date, o.occasion_type ?? "custom")
      )
    );

    const rows = candidates
      .map((o) => ({
        user_id: userId,
        recipient_id: recipientId,
        date: o.date,
        occasion_type: o.occasion_type || "custom",
      }))
      .filter((o) => {
        const key = occasionKey(o.date, o.occasion_type);
        if (seen.has(key)) return false;
        seen.add(key); // also de-dupe within this batch
        return true;
      });

    if (rows.length === 0) return 0;

    const { error } = await supabase.from("occasions").insert(rows);
    if (error) {
      console.error("Failed to persist occasions from update chat:", error);
      return 0;
    }
    return rows.length;
  } catch (error) {
    console.error("Failed to persist occasions from update chat:", error);
    return 0;
  }
}

const GIFT_POLL_INTERVAL_MS = 10000;
const GIFT_POLL_MAX_MS = 300000; // 5 minutes
const RESYNC_POLL_INTERVAL_MS = 4000;
const RESYNC_POLL_MAX_MS = 90000;

const newestTimestamp = (list: GiftSuggestion[]) =>
  list[0] ? new Date(list[0].generated_at).getTime() : 0;

// Nav-param-driven state: the param supplies the value until the user
// overrides it on-screen, and a fresh navigation (param change) takes over
// again. Implemented as a render-time adjustment rather than a param-mirroring
// effect. `derive` maps a changed param onto the value, with the previous
// value available for params whose absence means "keep what's shown".
function useParamDrivenState<P, T>(
  param: P,
  derive: (param: P, previous: T) => T
): [T, (value: T) => void] {
  const [cell, setCell] = useState(() => ({
    param,
    value: derive(param, undefined as T),
  }));
  let value = cell.value;
  if (cell.param !== param) {
    value = derive(param, cell.value);
    setCell({ param, value });
  }
  const setValue = (next: T) => setCell({ param, value: next });
  return [value, setValue];
}

export default function RecipientEditPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    tab?: string;
    addOccasion?: string;
    generating?: string;
    occasionId?: string;
  }>();
  const recipientId = params.id;
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const { showToast, toast } = useToast();
  const { data: userPreferences } = useUserPreferences();
  const defaultEmotionalTone =
    userPreferences?.user_summary?.default_emotional_tone;

  const [activeTab, setActiveTab] = useParamDrivenState<
    string | undefined,
    "details" | "gifts"
  >(params.tab, (tab, previous) =>
    tab === "details" || tab === "gifts" ? tab : previous ?? "gifts"
  );

  // A navigation that omits occasionId must clear the filter: a notification
  // tap without an occasion (e.g. on-demand gift generation) must not strand
  // the user on a stale filter pointing at an empty occasion.
  const [occasionFilter, setOccasionFilter] = useParamDrivenState<
    string | undefined,
    string | null
  >(params.occasionId, (id) => id ?? null);

  const [showAddOccasionChat, setShowAddOccasionChat] = useParamDrivenState<
    string | undefined,
    boolean
  >(params.addOccasion, (flag, previous) =>
    flag === "true" ? true : previous ?? false
  );

  const [showUpdateChat, setShowUpdateChat] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  // Baseline snapshot taken when a resynthesis kicks off; the recipient query
  // polls until synthesized_profile differs from it (or the poll times out).
  const [resyncBaseline, setResyncBaseline] = useState<{
    synopsis: string;
    startedAt: number;
  } | null>(null);

  // Baseline snapshot taken when gift generation kicks off; the suggestions
  // query polls until a newly generated idea shows up (a longer list, or a
  // newer newest timestamp) or the poll times out.
  const [genBaseline, setGenBaseline] = useState<{
    count: number;
    newest: number;
    startedAt: number;
  } | null>(null);

  const {
    data: recipient,
    isPending: recipientPending,
    isError: recipientError,
  } = useRecipient(recipientId, {
    refetchInterval: resyncBaseline
      ? () => {
          if (Date.now() - resyncBaseline.startedAt >= RESYNC_POLL_MAX_MS) {
            setResyncBaseline(null);
            return false;
          }
          return RESYNC_POLL_INTERVAL_MS;
        }
      : false,
  });

  // Canonical suggestions source: shares the TanStack Query cache with the
  // feedback drawer's mutation (optimistic removal + backfill) and applies the
  // GIFT_REMOVAL_ACTIONS filter, so dismissed gifts disappear and stay gone
  // here too — not only on the standalone Gift Ideas screen (DEV-137).
  const { data: suggestions = [], isLoading: loadingSuggestions } =
    useGiftSuggestions(recipientId, {
      refetchInterval: genBaseline
        ? () => {
            if (Date.now() - genBaseline.startedAt >= GIFT_POLL_MAX_MS) {
              setGenBaseline(null);
              return false;
            }
            return GIFT_POLL_INTERVAL_MS;
          }
        : false,
    });

  // Completion latches, adjusted during render: once the watched value moves
  // past its baseline, the poll is over.
  if (
    resyncBaseline &&
    recipient &&
    (recipient.synthesized_profile ?? "") !== resyncBaseline.synopsis
  ) {
    setResyncBaseline(null);
  }
  const isResynthesizing = resyncBaseline !== null;

  if (
    genBaseline &&
    (suggestions.length > genBaseline.count ||
      newestTimestamp(suggestions) > genBaseline.newest)
  ) {
    setGenBaseline(null);
  }
  const isGenerating = genBaseline !== null;

  // Start generation tracking when navigated from the add flow with
  // generating=true (only when there is nothing to show yet).
  const [seenGeneratingParam, setSeenGeneratingParam] = useState<
    string | undefined
  >(undefined);
  if (params.generating !== seenGeneratingParam) {
    setSeenGeneratingParam(params.generating);
    if (params.generating === "true" && suggestions.length === 0) {
      setGenBaseline({ count: 0, newest: 0, startedAt: Date.now() });
    }
  }

  // Human-readable label ("Christmas · Dec 25") for the filtered occasion so
  // the gifts header can name it without a second screen.
  const { data: filteredOccasion } = useOccasion(occasionFilter);
  const occasionLabel =
    occasionFilter && filteredOccasion
      ? `${formatOccasionType(
          filteredOccasion.occasion_type
        )} · ${formatOccasionDate(filteredOccasion.date, { month: "short" })}`
      : "";

  const deleteRecipient = useDeleteRecipient();

  // Add-occasion chat flow
  const addOccasionFlow = useAddOccasionFlow({
    recipientId: recipientId || "",
    recipientName: recipient?.name || "",
    onSuccess: () => {
      setShowAddOccasionChat(false);
      showToast("Occasion added!");
    },
  });

  // Update-what-we-know chat flow
  const updateFlow = useConversationFlow({
    conversationType: "update_field",
    existingData: recipient
      ? {
          id: recipient.id,
          name: recipient.name,
          relationship_type: recipient.relationship_type,
          interests: recipient.interests,
          birthday: recipient.birthday,
          emotional_tone_preference: recipient.emotional_tone_preference,
          gift_budget_min: recipient.gift_budget_min,
          gift_budget_max: recipient.gift_budget_max,
          address: recipient.address,
          address_line_2: recipient.address_line_2,
          city: recipient.city,
          state: recipient.state,
          zip_code: recipient.zip_code,
          country: recipient.country,
        }
      : undefined,
    initialMessage: recipient
      ? `Let's update what we know about ${recipient.name}. What's new?`
      : undefined,
  });

  // Kick off a profile resynthesis and surface a "refreshing" state until the
  // edge function writes a new synopsis. Fire-and-forget on the network call —
  // the server still completes even if the app backgrounds, and the polling
  // recipient query (with its max-wait timeout) is the source of truth.
  const resynthesizeProfile = (baseline?: string) => {
    if (!recipientId) return;
    setResyncBaseline({
      synopsis: baseline ?? recipient?.synthesized_profile ?? "",
      startedAt: Date.now(),
    });
    supabase.functions
      .invoke("synthesize-recipient-profile", {
        body: { recipientId },
      })
      .catch((err) => {
        console.error("synthesize-recipient-profile failed:", err);
      });
  };

  const handleFinishUpdateChat = async () => {
    if (!recipient || !user) return;
    const extracted = await updateFlow.handleFinishConversation();
    if (!extracted) {
      setShowUpdateChat(false);
      return;
    }

    const allowedKeys: (keyof Recipient)[] = [
      "name",
      "relationship_type",
      "interests",
      "birthday",
      "emotional_tone_preference",
      "gift_budget_min",
      "gift_budget_max",
      "address",
      "address_line_2",
      "city",
      "state",
      "zip_code",
      "country",
    ];
    const updates: Partial<Recipient> = {};
    for (const key of allowedKeys) {
      const value = (extracted as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && value !== "") {
        (updates as Record<string, unknown>)[key] = value;
      }
    }

    // Interests are reconciled, never overwritten. The extractor runs on just
    // this update conversation, so its `interests` are only the freshly-liked
    // ones and `interests_removed` are the ones the user dropped ("not into
    // pokemon, into fortnite"). A blind write would wipe everything else we
    // already know the recipient likes (DEV-119).
    const addedInterests = Array.isArray(extracted.interests)
      ? extracted.interests
      : [];
    const removedInterests = Array.isArray(extracted.interests_removed)
      ? extracted.interests_removed
      : [];
    if (addedInterests.length > 0 || removedInterests.length > 0) {
      updates.interests = reconcileInterests(
        recipient.interests ?? [],
        addedInterests,
        removedInterests
      );
    } else {
      // No interest signal this turn — leave the stored list untouched. (The
      // loop above may have copied an empty extracted array; drop it so we
      // never clobber existing interests with [].)
      delete (updates as Record<string, unknown>).interests;
    }

    // Normalize any extracted birthday into canonical storage form so we never
    // persist a loose "08-18" (DEV-105).
    if (typeof updates.birthday === "string") {
      const normalized = normalizeBirthday(updates.birthday);
      if (normalized) updates.birthday = normalized;
      else delete updates.birthday;
    }

    // Turn a user-volunteered age ("he's 47") into a birth year so the synopsis
    // can derive age instead of the LLM guessing. Backfill respects a birthday
    // we already know with a year (DEV-105).
    const extractedAge = (extracted as Record<string, unknown>).age;
    const ageNum =
      typeof extractedAge === "number" ? extractedAge : Number(extractedAge);
    const backfilledBirthday = backfillBirthdayFromAge(
      Number.isFinite(ageNum) ? ageNum : null,
      updates.birthday ?? recipient.birthday
    );
    if (backfilledBirthday) {
      updates.birthday = backfilledBirthday;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("recipients")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", recipient.id)
        .eq("user_id", user.id);
      if (error) {
        console.error("Failed to apply update from chat:", error);
      } else {
        queryClient.setQueryData<Recipient>(
          queryKeys.recipient(user.id, recipient.id),
          (prev) => (prev ? { ...prev, ...updates } : prev)
        );
        queryClient.invalidateQueries({
          queryKey: queryKeys.recipients(user.id),
        });
      }
    }

    // Persist any occasions mentioned in the update chat. The add-recipient flow
    // does this; the general update chat previously dropped them on the floor
    // (DEV-125). Non-fatal: a failure here never breaks the profile update.
    const insertedOccasions = await persistUpdateChatOccasions(
      user.id,
      recipient.id,
      Array.isArray(extracted.occasions) ? extracted.occasions : []
    );
    if (insertedOccasions > 0) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.occasions(user.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipientOccasions(recipient.id),
      });
    }

    setGenBaseline({
      count: suggestions.length,
      newest: newestTimestamp(suggestions),
      startedAt: Date.now(),
    });
    resynthesizeProfile(recipient.synthesized_profile ?? "");

    showToast(`Updated ${recipient.name}'s profile.`);
    setShowUpdateChat(false);
  };

  const handleConfirmDelete = () => {
    if (!recipient || !user) return;
    deleteRecipient.mutate(
      { userId: user.id, recipientId: recipient.id },
      {
        // Failures surface via the shared mutation handler's snackbar.
        onSuccess: () => {
          router.back();
        },
        onError: () => setConfirmDeleteVisible(false),
      }
    );
  };

  if (!authLoading && !user) {
    return <Redirect href="/" />;
  }

  if (recipientPending && !recipientError) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingPlaceholder}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!recipient) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingPlaceholder}>
          <Text>Recipient not found</Text>
          <Button mode="text" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  if (showAddOccasionChat) {
    return (
      <View style={styles.container}>
        <ConversationView
          messages={addOccasionFlow.messages}
          isLoading={addOccasionFlow.isLoading}
          messagesEndRef={addOccasionFlow.messagesEndRef}
          onNavigateBack={() => {
            setShowAddOccasionChat(false);
            addOccasionFlow.resetConversation();
          }}
          onSendMessage={addOccasionFlow.sendMessage}
          onFinishConversation={addOccasionFlow.handleFinishConversation}
          shouldShowNextStepButton={addOccasionFlow.shouldShowNextStepButton}
          conversationContext={addOccasionFlow.conversationContext}
          canRetry={addOccasionFlow.canRetrySend}
          onRetry={addOccasionFlow.retryLastSend}
          title="Add Occasion"
          finishButtonLabel="Save Occasion"
        />
      </View>
    );
  }

  if (showUpdateChat) {
    return (
      <View style={styles.container}>
        <ConversationView
          messages={updateFlow.messages}
          isLoading={updateFlow.isLoading}
          messagesEndRef={updateFlow.messagesEndRef}
          onNavigateBack={() => setShowUpdateChat(false)}
          onSendMessage={updateFlow.sendMessage}
          onFinishConversation={handleFinishUpdateChat}
          shouldShowNextStepButton={updateFlow.shouldShowNextStepButton}
          conversationContext={updateFlow.conversationContext ?? ""}
          canRetry={updateFlow.canRetrySend}
          onRetry={updateFlow.retryLastSend}
          title={`Update ${formatShortName(recipient.name)}`}
          finishButtonLabel="Save Updates"
        />
      </View>
    );
  }

  const shortName = formatShortName(recipient.name);
  return (
    <View style={styles.container}>
      {activeTab === "gifts" ? (
        <View style={styles.hero}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <MaterialIcons
              name="chevron-left"
              size={28}
              color={Colors.blues.dark}
            />
          </Pressable>
          <Text style={styles.heroTitle}>{shortName}&apos;s Gift Ideas</Text>
          <Pressable
            onPress={() => setActiveTab("details")}
            style={styles.aboutLink}
            accessibilityRole="link"
            accessibilityLabel={`About ${shortName}`}
            hitSlop={6}
          >
            <Text style={styles.aboutLinkText}>About {shortName} ›</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.detailsHeader}>
          <IconButton
            icon="chevron-left"
            size={28}
            onPress={() => setActiveTab("gifts")}
            iconColor={Colors.blues.dark}
            accessibilityLabel="Back to Gift Ideas"
          />
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 0),
        }}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "details" ? (
          <AboutRecipientView
            recipient={recipient}
            defaultEmotionalTone={defaultEmotionalTone}
            isResynthesizing={isResynthesizing}
            onResynthesize={() => resynthesizeProfile()}
            onRecipientUpdated={(updated) => {
              if (!user) return;
              queryClient.setQueryData<Recipient>(
                queryKeys.recipient(user.id, updated.id),
                updated
              );
              queryClient.invalidateQueries({
                queryKey: queryKeys.recipients(user.id),
              });
            }}
            onOpenUpdateChat={() => {
              updateFlow.resetConversation();
              setShowUpdateChat(true);
            }}
            onDelete={() => setConfirmDeleteVisible(true)}
          />
        ) : (
          <>
            <View style={styles.giftsContainer}>
              <GiftSuggestionsList
                suggestions={suggestions}
                loading={loadingSuggestions}
                recipientName={formatShortName(recipient.name)}
                isGenerating={isGenerating}
                occasionId={occasionFilter}
                occasionLabel={occasionLabel}
                onClearOccasionFilter={() => setOccasionFilter(null)}
              />
            </View>
            {/* Full-bleed band — outside the padded gifts container. */}
            <View style={styles.pastSection}>
              <PastGiftsSection
                suggestions={suggestions}
                occasionId={occasionFilter}
              />
            </View>
          </>
        )}
      </ScrollView>
      <Portal>
        <Dialog
          visible={confirmDeleteVisible}
          onDismiss={() => setConfirmDeleteVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Delete {recipient.name}?</Dialog.Title>
          <Dialog.Content>
            <Text>
              This will permanently remove {recipient.name} and their gift
              ideas. This cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDeleteVisible(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleConfirmDelete}
              loading={deleteRecipient.isPending}
              disabled={deleteRecipient.isPending}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {toast}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 4,
    marginLeft: -4,
    marginBottom: 4,
  },
  heroTitle: {
    ...Typography.h1,
    color: Colors.blues.dark,
    marginBottom: 6,
  },
  aboutLink: {
    alignSelf: "flex-start",
  },
  aboutLinkText: {
    ...Typography.largeCta,
    color: Colors.brand.gold,
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  content: {
    flex: 1,
  },
  giftsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pastSection: {
    // Active cards → band gap from the frame (4306:1620: 20pt).
    marginTop: 20,
  },
  dialog: {
    borderRadius: 18,
  },
});
