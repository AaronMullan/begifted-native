import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, IconButton } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { queryKeys } from "../../../lib/query-keys";
import { BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import type { Recipient } from "../../../types/recipient";
import { AboutRecipientView } from "../../../components/recipients/AboutRecipientView";
import GiftSuggestionsList from "../../../components/gifts/GiftSuggestionsList";
import PastGiftsDrawer, {
  COLLAPSED_DRAWER_HEIGHT,
} from "../../../components/gifts/PastGiftsDrawer";
import { partitionSuggestions } from "../../../components/gifts/partition";
import { useGiftSuggestions } from "../../../hooks/use-gift-suggestions";
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
  const initialTab = (params.tab as "details" | "gifts") || "gifts";
  const shouldAddOccasion = params.addOccasion === "true";

  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "gifts">(initialTab);
  const [occasionFilter, setOccasionFilter] = useState<string | null>(
    params.occasionId ?? null
  );
  const [occasionLabel, setOccasionLabel] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddOccasionChat, setShowAddOccasionChat] = useState(false);
  const [showUpdateChat, setShowUpdateChat] = useState(false);
  const [isResynthesizing, setIsResynthesizing] = useState(false);
  // Snapshot of the synopsis taken when a resynthesis is kicked off, so the
  // poller can detect when the edge function has written a fresh one.
  const resyncBaselineRef = useRef<string>("");
  const scrollRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();
  // Canonical suggestions source: shares the TanStack Query cache with the
  // feedback drawer's mutation (optimistic removal + backfill) and applies the
  // GIFT_REMOVAL_ACTIONS filter, so dismissed gifts disappear and stay gone
  // here too — not only on the standalone Gift Ideas screen (DEV-137).
  const {
    data: suggestions = [],
    isLoading: loadingSuggestions,
    refetch: refetchSuggestions,
  } = useGiftSuggestions(recipientId);
  const { showToast, toast } = useToast();
  const { data: userPreferences } = useUserPreferences();
  const defaultEmotionalTone =
    userPreferences?.user_summary?.default_emotional_tone;

  // Fetch recipient data
  useEffect(() => {
    if (!recipientId) return;

    const fetchRecipient = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/");
          return;
        }

        const { data, error } = await supabase
          .from("recipients")
          .select("*")
          .eq("id", recipientId)
          .eq("user_id", session.user.id)
          .single();

        if (error) throw error;
        setRecipient(data);
      } catch (error) {
        console.error("Error fetching recipient:", error);
        Alert.alert("Error", "Failed to load recipient");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchRecipient();
  }, [recipientId, router]);

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
  // edge function writes a new synopsis. `baseline` is the synopsis we expect
  // to change; the poller below watches for it to differ. Fire-and-forget on
  // the network call — the server still completes even if the app backgrounds,
  // and the poller (with its max-wait timeout) is the source of truth.
  const resynthesizeProfile = (baseline?: string) => {
    if (!recipientId) return;
    resyncBaselineRef.current =
      baseline ?? recipient?.synthesized_profile ?? "";
    setIsResynthesizing(true);
    supabase.functions
      .invoke("synthesize-recipient-profile", {
        body: { recipientId },
      })
      .catch((err) => {
        console.error("synthesize-recipient-profile failed:", err);
      });
  };

  const handleFinishUpdateChat = async () => {
    if (!recipient) return;
    const extracted = await updateFlow.handleFinishConversation();
    if (!extracted) {
      setShowUpdateChat(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
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
        .eq("user_id", session.user.id);
      if (error) {
        console.error("Failed to apply update from chat:", error);
      } else {
        setRecipient((prev) => (prev ? { ...prev, ...updates } : null));
      }
    }

    // Persist any occasions mentioned in the update chat. The add-recipient flow
    // does this; the general update chat previously dropped them on the floor
    // (DEV-125). Non-fatal: a failure here never breaks the profile update.
    const insertedOccasions = await persistUpdateChatOccasions(
      session.user.id,
      recipient.id,
      Array.isArray(extracted.occasions) ? extracted.occasions : []
    );
    if (insertedOccasions > 0) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.occasions(session.user.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipientOccasions(recipient.id),
      });
    }

    setIsGenerating(true);
    resynthesizeProfile(recipient.synthesized_profile ?? "");

    showToast(`Updated ${recipient.name}'s profile.`);
    setShowUpdateChat(false);
  };

  // Auto-open add-occasion flow when navigated with addOccasion param
  useEffect(() => {
    if (shouldAddOccasion && recipient) {
      addOccasionFlow.resetConversation();
      setShowAddOccasionChat(true);
    }
  }, [shouldAddOccasion, recipient]);

  // Reset active tab when tab param changes
  useEffect(() => {
    if (params.tab) {
      setActiveTab(params.tab as "details" | "gifts");
    }
  }, [params.tab]);

  // Sync the occasion filter to the navigation param. Clearing it when no
  // occasionId is passed is essential: a notification tap that omits the
  // occasion (e.g. on-demand gift generation) must not strand the user on a
  // stale filter pointing at an empty occasion.
  useEffect(() => {
    setOccasionFilter(params.occasionId ?? null);
  }, [params.occasionId]);

  // Resolve a human-readable label ("Christmas · Dec 25") for the filtered
  // occasion so the gifts header can name it without a second screen.
  useEffect(() => {
    if (!occasionFilter) {
      setOccasionLabel("");
      return;
    }
    let cancelled = false;
    const fetchOccasionLabel = async () => {
      const { data, error } = await supabase
        .from("occasions")
        .select("occasion_type, date")
        .eq("id", occasionFilter)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setOccasionLabel(
        `${formatOccasionType(
          data.occasion_type || "birthday"
        )} · ${formatOccasionDate(data.date, { month: "short" })}`
      );
    };
    fetchOccasionLabel();
    return () => {
      cancelled = true;
    };
  }, [occasionFilter]);

  // Auto-start polling when navigated from the add flow with generating=true
  useEffect(() => {
    if (recipient && params.generating === "true" && suggestions.length === 0) {
      setIsGenerating(true);
    }
  }, [recipient, params.generating]);

  // Polling logic for gift generation. The suggestions list itself comes from
  // useGiftSuggestions; here we just refetch on an interval and watch for a
  // newly generated idea (a longer list, or a newer newest timestamp than the
  // baseline captured when generation started) to clear the spinner.
  useEffect(() => {
    if (!isGenerating || !recipient) return;

    const newestTimestamp = (list: typeof suggestions) =>
      list[0] ? new Date(list[0].generated_at).getTime() : 0;
    const baseline = {
      count: suggestions.length,
      newest: newestTimestamp(suggestions),
    };

    const POLL_INTERVAL = 10000; // 10 seconds
    const MAX_POLL_TIME = 300000; // 5 minutes
    const startTime = Date.now();

    const pollInterval = setInterval(async () => {
      // Check if we've exceeded max poll time
      if (Date.now() - startTime >= MAX_POLL_TIME) {
        console.log("Polling timeout reached, stopping generation tracking");
        setIsGenerating(false);
        clearInterval(pollInterval);
        return;
      }

      const { data } = await refetchSuggestions();
      const next = data ?? [];
      if (
        next.length > baseline.count ||
        newestTimestamp(next) > baseline.newest
      ) {
        setIsGenerating(false);
      }
    }, POLL_INTERVAL);

    // Cleanup on unmount or when isGenerating becomes false
    return () => {
      clearInterval(pollInterval);
    };
  }, [isGenerating, recipient, refetchSuggestions]);

  // Poll the recipient row for a freshly synthesized profile after an update.
  // The synthesize edge function regenerates synthesized_profile (plus
  // known_roles / household_context) server-side; we watch for it to change
  // from the baseline snapshot taken when the resync was triggered.
  useEffect(() => {
    if (!isResynthesizing || !recipientId) return;

    const POLL_INTERVAL = 4000; // 4 seconds
    const MAX_POLL_TIME = 90000; // 90 seconds
    const startTime = Date.now();

    const pollInterval = setInterval(async () => {
      if (Date.now() - startTime >= MAX_POLL_TIME) {
        setIsResynthesizing(false);
        clearInterval(pollInterval);
        return;
      }

      const { data, error } = await supabase
        .from("recipients")
        .select(
          "synthesized_profile, known_roles, household_context, updated_at"
        )
        .eq("id", recipientId)
        .maybeSingle();

      if (error || !data) return;

      if ((data.synthesized_profile ?? "") !== resyncBaselineRef.current) {
        setRecipient((prev) =>
          prev
            ? {
                ...prev,
                synthesized_profile:
                  data.synthesized_profile ?? prev.synthesized_profile,
                known_roles: data.known_roles ?? prev.known_roles,
                household_context:
                  data.household_context ?? prev.household_context,
                updated_at: data.updated_at ?? prev.updated_at,
              }
            : prev
        );
        setIsResynthesizing(false);
        clearInterval(pollInterval);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [isResynthesizing, recipientId]);

  const handleDelete = async () => {
    if (!recipient) return;

    Alert.alert(
      "Delete Recipient",
      `Are you sure you want to delete ${recipient.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              if (!session?.user) return;

              const { error } = await supabase
                .from("recipients")
                .delete()
                .eq("id", recipient.id)
                .eq("user_id", session.user.id);

              if (error) throw error;

              router.back();
            } catch (error) {
              console.error("Error deleting recipient:", error);
              Alert.alert("Error", "Failed to delete recipient");
            }
          },
        },
      ]
    );
  };

  if (loading) {
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
          onNavigateBack={() => setShowAddOccasionChat(false)}
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
  const upperShortName = shortName.toUpperCase();

  // Pinned Past Gifts drawer lives only on the gifts tab; its collapsed bar
  // needs extra scroll clearance so active cards don't hide behind it.
  const hasPastGifts =
    partitionSuggestions(suggestions, occasionFilter).past.length > 0;
  const showPastDrawer = activeTab === "gifts" && hasPastGifts;

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
            <Text style={styles.aboutLinkText}>ABOUT {upperShortName} ›</Text>
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
          paddingBottom:
            BOTTOM_NAV_HEIGHT +
            Math.max(insets.bottom, 0) +
            (showPastDrawer ? COLLAPSED_DRAWER_HEIGHT : 0),
        }}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "details" ? (
          <AboutRecipientView
            recipient={recipient}
            defaultEmotionalTone={defaultEmotionalTone}
            isResynthesizing={isResynthesizing}
            onResynthesize={() => resynthesizeProfile()}
            onRecipientUpdated={(updated) => setRecipient(updated)}
            onOpenUpdateChat={() => {
              updateFlow.resetConversation();
              setShowUpdateChat(true);
            }}
            onDelete={handleDelete}
          />
        ) : (
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
        )}
      </ScrollView>
      {showPastDrawer && (
        <PastGiftsDrawer
          suggestions={suggestions}
          occasionId={occasionFilter}
        />
      )}
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
    ...Typography.sectionHeadAc,
    letterSpacing: 0.8,
    color: Colors.blues.dark,
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
});
