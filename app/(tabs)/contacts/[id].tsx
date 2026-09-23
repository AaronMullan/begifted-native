import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Button, Dialog, Portal } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Redirect,
  useRouter,
  useLocalSearchParams,
  useIsFocused,
} from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { logProductEvent, logProductEvents } from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";
import { BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import GradientBackground from "../../../components/GradientBackground";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import type { Recipient, GiftSuggestion } from "../../../types/recipient";
import { AboutRecipientView } from "../../../components/recipients/AboutRecipientView";
import GiftSuggestionsList from "../../../components/gifts/GiftSuggestionsList";
import { partitionSuggestions } from "../../../components/gifts/partition";
import PastGiftsSection from "../../../components/gifts/PastGiftsSection";
import { useBetaCheckIn } from "../../../components/beta/BetaCheckInProvider";
import { useAuth } from "../../../hooks/use-auth";
import { useRecipient } from "../../../hooks/use-recipient";
import { useGiftSuggestions } from "../../../hooks/use-gift-suggestions";
import { useDeleteRecipient } from "../../../hooks/use-recipient-mutations";
import {
  UpdateKnowledgeDrawer,
  type UpdateKnowledgeDrawerHandle,
} from "../../../components/recipients/UpdateKnowledgeDrawer";
import {
  AddMomentDrawer,
  type AddMomentDrawerHandle,
} from "../../../components/moments/AddMomentDrawer";
import {
  useCreateOccasion,
  useRecipientOccasions,
} from "../../../hooks/use-occasion-mutations";
import { recommendedMomentsFor } from "../../../utils/recommended-moments";
import { useInterestMomentSuggestions } from "../../../hooks/use-interest-moment-suggestions";
import { slugifyOccasionName } from "../../../hooks/use-occasion-recommendations";
import { invokeWithRetry } from "../../../lib/edge-retry";
import { captureMutationError } from "../../../lib/sentry-helpers";
import type { ExtractedData } from "../../../hooks/use-conversation-flow";
import { useUserPreferences } from "../../../hooks/use-user-preferences";
import { formatShortName } from "../../../lib/format-name";
import { showSnackbar } from "../../../components/GlobalSnackbar";
import {
  backfillBirthdayFromAge,
  birthdayHasYear,
  birthYearFromAge,
  birthYearFromYearOnly,
  normalizeBirthday,
} from "../../../utils/birthday";
import { sanitizeExtractedOccasionDate } from "../../../utils/occasion-dates";
import { reconcileInterests } from "../../../utils/interests";

// Insert occasions captured by the general "Update what we know" chat into the
// occasions table, de-duplicating against the recipient's existing occasions by
// (date, type) so re-mentioning one never creates a copy. Returns the number of
// rows inserted, or null if the write failed. Callers must not treat a failure
// as zero: a note whose only content was a moment would then be reported as
// holding nothing new. A failure still never fails a profile update that did
// succeed (DEV-125) — that is the caller's call to make, not this helper's.
async function persistUpdateChatOccasions(
  userId: string,
  recipientId: string,
  occasions: { date: string | null; occasion_type: string }[]
): Promise<number | null> {
  // AI dates are advisory: known types resolve through the holiday lookup,
  // Jan-1 placeholders are rejected, and anything still undated is dropped
  // (the update chat has no review screen where a date could be added).
  const candidates = occasions
    .filter((o) => o)
    .map((o) => ({
      occasion_type: o.occasion_type,
      date: sanitizeExtractedOccasionDate(o.occasion_type, o.date),
    }))
    .filter((o): o is { occasion_type: string; date: string } => !!o.date);
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
      return null;
    }
    logProductEvents(
      userId,
      rows.map((row) => ({
        name: "occasion_added" as const,
        properties: {
          recipient_id: recipientId,
          occasion_type: row.occasion_type,
          source: "update_chat",
        },
      }))
    );
    return rows.length;
  } catch (error) {
    console.error("Failed to persist occasions from update chat:", error);
    return null;
  }
}

// Mirrors PLACEHOLDER_STRINGS in the extractor: the model returns these as
// literal strings, and a free-text field has no required-field gate to catch
// them before they reach the user.
const PLACEHOLDER_ECHOES = new Set(["null", "undefined", "none", "n/a", ""]);

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
  const { triggerCheckIn } = useBetaCheckIn();
  const scrollRef = useRef<ScrollView>(null);
  const { data: userPreferences } = useUserPreferences();
  const defaultEmotionalTone =
    userPreferences?.user_summary?.default_emotional_tone;

  const [activeTab, setActiveTab] = useParamDrivenState<
    string | undefined,
    "details" | "gifts"
  >(params.tab, (tab, previous) =>
    tab === "details" || tab === "gifts" ? tab : (previous ?? "gifts")
  );

  // Tabs are local state, so a tab switch pushes nothing onto the navigation
  // stack; each header's back affordance has to unwind that switch itself
  // instead of popping the route (which lands on whatever pushed it). This is a
  // one-deep in-screen back stack: a forward switch records the tab left
  // behind, and going back *consumes* it, so back can never bounce between the
  // two tabs forever. Null means the current tab was reached by navigation, so
  // back belongs to the router. Keyed on the tab param so a fresh navigation
  // into either tab resets it.
  const [innerBackTab, setInnerBackTab] = useParamDrivenState<
    string | undefined,
    "details" | "gifts" | null
  >(params.tab, () => null);

  const goBackFromTab = (previous: "details" | "gifts") => {
    if (innerBackTab !== previous) {
      router.back();
      return;
    }
    setInnerBackTab(null);
    setActiveTab(previous);
  };

  const showDetailsFromGifts = () => {
    setInnerBackTab("gifts");
    setActiveTab("details");
  };

  const showGiftsFromDetails = () => {
    setInnerBackTab("details");
    setActiveTab("gifts");
  };

  // A navigation that omits occasionId must clear the filter: a notification
  // tap without an occasion (e.g. on-demand gift generation) must not strand
  // the user on a stale filter pointing at an empty occasion.
  const [occasionFilter, setOccasionFilter] = useParamDrivenState<
    string | undefined,
    string | null
  >(params.occasionId, (id) => id ?? null);

  const [addMomentRequested, setAddMomentRequested] = useParamDrivenState<
    string | undefined,
    boolean
  >(params.addOccasion, (flag, previous) =>
    flag === "true" ? true : (previous ?? false)
  );

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
            // The nav-param start path seeds startedAt=0 (Date.now() is impure
            // in render); stamp the real start time on the first tick.
            const startedAt = genBaseline.startedAt || Date.now();
            if (startedAt !== genBaseline.startedAt) {
              setGenBaseline({ ...genBaseline, startedAt });
            } else if (Date.now() - startedAt >= GIFT_POLL_MAX_MS) {
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

  // First gift set reviewed -> fire the third beta check-in once the gifts tab
  // shows a settled, non-empty set (not still generating). Effect, not a render
  // latch, because it responds to async data arrival; the provider gates it to
  // a single showing per user. The check-in only ever shows once, so a
  // mistimed fire permanently consumes it — every conjunct below guards a way
  // gift cards could be absent from the screen while suggestion rows exist:
  // the screen must be focused (a notification tap can stack another [id]
  // instance on top while this one keeps polling), the recipient query must
  // have resolved (before that the screen is a bare loading placeholder, and
  // suggestions can win the race), and the count must be the partition the
  // list actually renders (an occasion filter can leave the screen empty
  // while older suggestions for other occasions exist).
  const isFocused = useIsFocused();
  const { visible, past } = partitionSuggestions(suggestions, occasionFilter);
  const visibleSuggestionCount = visible.length;
  // When the past band renders it is the last thing in the scroll, so it
  // carries the nav clearance itself and its fill reaches the nav.
  const navClearance = BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 0);
  const hasPastBand = activeTab !== "details" && past.length > 0;
  const giftsReady =
    isFocused &&
    activeTab === "gifts" &&
    !isGenerating &&
    !!recipient &&
    visibleSuggestionCount > 0;
  const loggedRecommendationsViewRef = useRef(false);
  useEffect(() => {
    if (!giftsReady) return;
    triggerCheckIn("first_gift_set");
    // Log recommendations_viewed once per screen visit, when the gifts tab
    // actually shows a settled set — not merely on mount.
    if (user && recipientId && !loggedRecommendationsViewRef.current) {
      loggedRecommendationsViewRef.current = true;
      logProductEvent(user.id, "recommendations_viewed", {
        recipient_id: recipientId,
        suggestion_count: suggestions.length,
        screen: "recipient_detail",
      });
    }
  }, [giftsReady, triggerCheckIn, user, recipientId, suggestions.length]);

  // Start generation tracking when navigated from the add flow with
  // generating=true (only when there is nothing to show yet).
  const [seenGeneratingParam, setSeenGeneratingParam] = useState<
    string | undefined
  >(undefined);
  if (params.generating !== seenGeneratingParam) {
    setSeenGeneratingParam(params.generating);
    if (params.generating === "true" && suggestions.length === 0) {
      // startedAt is stamped by the first poll tick below; Date.now() is impure
      // during render, so seed 0 and let the refetchInterval fill in the clock.
      setGenBaseline({ count: 0, newest: 0, startedAt: 0 });
    }
  }

  const deleteRecipient = useDeleteRecipient();

  // Navigating in with ?addOccasion=true (e.g. calendar's "Add Moments"
  // without a day picked) opens the chip drawer. The flag is cleared on
  // present so recipient refetches don't re-open a dismissed drawer.
  const addMomentRef = useRef<AddMomentDrawerHandle | null>(null);
  const createOccasion = useCreateOccasion();
  // Shares AboutRecipientView's query, so this adds no extra fetch.
  const { data: recipientOccasions = [], isSuccess: occasionsLoaded } =
    useRecipientOccasions(recipientId);
  // Latches on the first drawer open so browsing profiles never spends an
  // AI call; the per-recipient cache makes later opens free anyway. The
  // param-driven path latches during render (adjust-state pattern), not in
  // the effect below, so the effect stays free of setState.
  const [momentDrawerOpened, setMomentDrawerOpened] = useState(false);
  if (addMomentRequested && !momentDrawerOpened) setMomentDrawerOpened(true);
  const presentAddMoment = () => {
    setMomentDrawerOpened(true);
    addMomentRef.current?.present();
  };
  const interestSuggestions = useInterestMomentSuggestions(
    recipient,
    occasionsLoaded ? recipientOccasions : undefined,
    momentDrawerOpened
  );
  useEffect(() => {
    if (addMomentRequested && recipient) {
      addMomentRef.current?.present();
      setAddMomentRequested(false);
    }
  }, [addMomentRequested, recipient, setAddMomentRequested]);

  const handleSaveMoment = async (
    momentName: string,
    date: string | null
  ): Promise<boolean> => {
    if (!recipientId) return false;
    return new Promise((resolve) => {
      createOccasion.mutate(
        {
          recipientId,
          // The drawer resolves known holidays and requires an MM-DD entry
          // otherwise, so every moment added here lands dated.
          date,
          occasionType: slugifyOccasionName(momentName),
          isAnnual: true,
        },
        {
          // Failures surface via the shared mutation handler's snackbar.
          onSuccess: () => {
            showSnackbar("Moment added");
            resolve(true);
          },
          onError: () => resolve(false),
        }
      );
    });
  };

  // Two-step "Update what BeGifted knows" drawer (replaces the full-screen
  // update chat). The note is extracted single-shot on Save.
  const updateDrawerRef = useRef<UpdateKnowledgeDrawerHandle | null>(null);

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

  // Persist a reviewed update note: extract structured fields from the single
  // free-form message, then apply them exactly as the old update chat did.
  // Returns true when the drawer should close.
  const handleSaveUpdateNote = async (text: string): Promise<boolean> => {
    if (!recipient || !user || !text) return false;

    let extracted: ExtractedData | null = null;
    try {
      const { data, error } = await invokeWithRetry<
        ExtractedData & { extractedData?: ExtractedData }
      >("recipient-conversation", {
        body: {
          action: "extract",
          conversationType: "update_field",
          messages: [{ role: "user", content: text }],
          existingData: {
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
          },
        },
      });
      if (error) throw error;
      extracted = data?.extractedData || data || null;
    } catch (error) {
      console.error("Failed to extract update note:", error);
      showSnackbar("Couldn't save that — please try again.");
      return false;
    }
    if (!extracted) {
      showSnackbar("Couldn't save that — please try again.");
      return false;
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

    // The extractor names this one in camelCase, so the sweep above can't see
    // it. Set-only on purpose: an update conversation that simply doesn't
    // mention the subject must not erase what intake captured — deleting it is
    // the About field's job, where the user can see what they're removing.
    const statedContext = (extracted as Record<string, unknown>)
      .culturalContext;
    // The model echoes "null"/"none" as strings often enough that extraction
    // coerces them for the required fields; this one is free text with no
    // required-field gate to catch it, so it would render verbatim under
    // "Holidays they celebrate" and reach the occasion prompt.
    if (
      typeof statedContext === "string" &&
      !PLACEHOLDER_ECHOES.has(statedContext.trim().toLowerCase())
    ) {
      updates.cultural_context = statedContext.trim();
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
      // A bare year ("born in 1961") is not a birthday, but it is a birth
      // year — keep it unless a full birthday already carries one.
      const yearOnly = birthYearFromYearOnly(updates.birthday);
      if (normalized) updates.birthday = normalized;
      else delete updates.birthday;
      if (yearOnly && !birthdayHasYear(recipient.birthday)) {
        updates.birth_year = yearOnly;
      }
    }

    // Turn a user-volunteered age ("he's 47") into a birth year so the synopsis
    // can derive age instead of the LLM guessing. Backfill respects a birthday
    // we already know with a year. With a known month/day the year lands on
    // the birthday; with no date at all it goes to birth_year — never a
    // fabricated Jan-1 birthday, which the cron would read as a real date.
    const extractedAge = (extracted as Record<string, unknown>).age;
    const ageNum =
      typeof extractedAge === "number" ? extractedAge : Number(extractedAge);
    const age = Number.isFinite(ageNum) ? ageNum : null;
    const knownBirthday = updates.birthday ?? recipient.birthday;
    const backfilledBirthday = backfillBirthdayFromAge(age, knownBirthday);
    if (backfilledBirthday) {
      updates.birthday = backfilledBirthday;
    } else if (!birthdayHasYear(knownBirthday) && updates.birth_year == null) {
      // A stated year (set above) beats a year approximated from an age.
      const birthYear = birthYearFromAge(age);
      if (birthYear) updates.birth_year = birthYear;
    }

    const hasFieldUpdates = Object.keys(updates).length > 0;
    if (hasFieldUpdates) {
      const { data: updated, error } = await supabase
        .from("recipients")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", recipient.id)
        .eq("user_id", user.id)
        .select("id");
      // RLS filters a non-matching UPDATE to zero rows and still resolves
      // without an error, so an empty result is a write that didn't happen.
      // Reporting success here would close the drawer over unsaved edits while
      // the screen keeps showing the stale value, which reads as saved.
      //
      // Bailing here also skips the occasion write below. That is safe because
      // the drawer stays open holding the note, and a retry re-submits the whole
      // thing — occasions de-duplicate by (date, type), so nothing doubles.
      if (error || !updated?.length) {
        console.error("Failed to apply update from chat:", error);
        captureMutationError(
          error ?? new Error("Recipient update matched no rows"),
          queryKeys.recipient(user.id, recipient.id)
        );
        showSnackbar("Couldn't save that — please try again.");
        return false;
      }
      queryClient.setQueryData<Recipient>(
        queryKeys.recipient(user.id, recipient.id),
        (prev) => (prev ? { ...prev, ...updates } : prev)
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients(user.id),
      });
      // This path can now set cultural_context too, and the AI suggestions
      // are prompted with it — without this the deterministic chips swap to
      // the stated holiday while the AI half of the same drawer keeps
      // serving a day of suggestions computed without it.
      if (updates.cultural_context !== undefined) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.momentSuggestions(recipient.id),
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
    if (insertedOccasions !== null && insertedOccasions > 0) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.occasions(user.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipientOccasions(recipient.id),
      });
    }

    if (!hasFieldUpdates) {
      // A moment was the note's only content and storing it failed, so there is
      // nothing saved to report. Where a field update did land, the same
      // failure stays quiet on purpose (DEV-125).
      if (insertedOccasions === null) {
        showSnackbar("Couldn't save that — please try again.");
        return false;
      }
      // Extraction can come back with nothing this handler is allowed to store.
      // Then there is no profile change to claim, and nothing for a resynthesis
      // to work from either.
      if (insertedOccasions === 0) {
        showSnackbar("Nothing new to add from that note.");
        return true;
      }
    }

    setGenBaseline({
      count: suggestions.length,
      newest: newestTimestamp(suggestions),
      startedAt: Date.now(),
    });
    resynthesizeProfile(recipient.synthesized_profile ?? "");

    showSnackbar(`Updated ${recipient.name}'s profile.`);
    return true;
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
        <GradientBackground />
        <View style={styles.loadingPlaceholder}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!recipient) {
    return (
      <View style={styles.container}>
        <GradientBackground />
        <View style={styles.loadingPlaceholder}>
          <Text>Recipient not found</Text>
          <Button mode="text" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  const shortName = formatShortName(recipient.name);
  return (
    <View style={styles.container}>
      <GradientBackground />
      {activeTab === "gifts" ? (
        <View style={styles.hero}>
          <Pressable
            onPress={() => goBackFromTab("details")}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <MaterialIcons
              name="chevron-left"
              size={28}
              color={Colors.brand.darkTeal}
            />
          </Pressable>
          <Text style={styles.heroTitle}>{shortName}&apos;s Gift Ideas</Text>
          <Pressable
            onPress={showDetailsFromGifts}
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
          <Pressable
            onPress={() => goBackFromTab("gifts")}
            style={styles.detailsBackLink}
            accessibilityRole="button"
            accessibilityLabel={
              innerBackTab === "gifts" ? "Back to Gift Ideas" : "Go back"
            }
            hitSlop={8}
          >
            <MaterialIcons
              name="chevron-left"
              size={20}
              color={Colors.brand.darkTeal}
            />
            <Text style={styles.detailsBackText}>
              {innerBackTab === "gifts" ? "Gift Ideas" : "Back"}
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: hasPastBand ? 0 : navClearance,
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
              const previousContext =
                queryClient.getQueryData<Recipient>(
                  queryKeys.recipient(user.id, updated.id)
                )?.cultural_context ?? null;
              queryClient.setQueryData<Recipient>(
                queryKeys.recipient(user.id, updated.id),
                updated
              );
              queryClient.invalidateQueries({
                queryKey: queryKeys.recipients(user.id),
              });
              // Occasion rows embed recipient fields (photo_url, name) that the
              // dashboard and calendar render from; without this the homepage
              // avatar stays stale until the next background refetch.
              queryClient.invalidateQueries({
                queryKey: queryKeys.occasions(user.id),
              });
              // Only when the phrase itself moved. The suggestions are capped
              // at one AI call per recipient per day precisely so browsing a
              // profile costs nothing, and this callback also fires for photo,
              // address and preference edits.
              if (previousContext !== (updated.cultural_context ?? null)) {
                queryClient.invalidateQueries({
                  queryKey: queryKeys.momentSuggestions(updated.id),
                });
              }
            }}
            onOpenUpdateChat={() => updateDrawerRef.current?.present()}
            onAddOccasion={presentAddMoment}
            onViewGiftIdeas={(occasionId) => {
              setOccasionFilter(occasionId);
              showGiftsFromDetails();
              scrollRef.current?.scrollTo({ y: 0, animated: false });
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
                onClearOccasionFilter={() => setOccasionFilter(null)}
              />
            </View>
            {/* Full-bleed band — outside the padded gifts container. */}
            <View style={styles.pastSection}>
              <PastGiftsSection
                suggestions={suggestions}
                occasionId={occasionFilter}
                bottomInset={navClearance}
              />
            </View>
          </>
        )}
      </ScrollView>
      <UpdateKnowledgeDrawer
        title="Update what BeGifted knows"
        reviewTitle="Update what we know"
        prompt={`What should BeGifted know about ${shortName}?`}
        placeholder="e.g. loves architecture and modern design, gets excited about thoughtful, unexpected gifts rather than generic ones."
        onSave={handleSaveUpdateNote}
        handleRef={updateDrawerRef}
      />
      <AddMomentDrawer
        recommendedLabel={`RECOMMENDED FOR ${shortName.toUpperCase()}`}
        recommendedMoments={recommendedMomentsFor(
          recipient.relationship_type,
          recipientOccasions.map((o) => o.occasion_type),
          interestSuggestions.names,
          recipient.cultural_context
        )}
        suggestionDates={interestSuggestions.dateBySlug}
        onSave={handleSaveMoment}
        saving={createOccasion.isPending}
        handleRef={addMomentRef}
        captureDate
      />
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
    color: Colors.brand.darkTeal,
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
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  detailsBackLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: 4,
    gap: 4,
    // Cancel the chevron glyph's internal inset so it aligns with the
    // gifts-tab back chevron at the 20pt gutter.
    marginLeft: -4,
  },
  detailsBackText: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
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
    flexGrow: 1,
  },
  dialog: {
    borderRadius: 18,
  },
});
