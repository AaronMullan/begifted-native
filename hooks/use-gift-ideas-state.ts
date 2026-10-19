import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRecipientOccasions } from "./use-occasion-mutations";
import { useUserPreferences } from "./use-user-preferences";
import { queryKeys } from "../lib/query-keys";
import { requestGiftIdeas } from "../lib/api/gifts";
import {
  DEFAULT_LEAD_DAYS,
  canRequestGiftIdeas,
  giftIdeasEmptyState,
  isGenerationInFlight,
  pickStateOccasion,
} from "../components/gifts/gift-ideas-state";
import type { GiftIdeasEmptyState } from "../components/gifts/gift-ideas-state";

export const GIFT_STATE_POLL_MS = 10000;

/** How long to keep watching an in-window occasion that has no run yet. The
 * add flow's run stamps within seconds of the add, and until it does its
 * occasion reads as scheduled; past this, the next run is the daily cron,
 * which isn't worth polling for. */
const UNSTARTED_POLL_MAX_MS = 5 * 60 * 1000;

/**
 * Server-derived state for an empty Gift Ideas list, for the occasion the list
 * is filtered to (or the recipient's most relevant one when unfiltered).
 *
 * While an empty, focused list is generating it re-fetches occasions and then
 * suggestions on one timer. The order matters: a run stores its gifts before
 * it stamps its outcome and clears its start stamp, so once occasions show the
 * run finished, a suggestions read that starts afterwards includes its gifts.
 * The same pairing runs once on open, since suggestions may be served from a
 * cache older than the occasions just fetched.
 *
 * An empty list for an occasion that has never had a set asks the server for
 * one, once per occasion per visit, and reads as generating from the first
 * render so the not-due copy never flashes before the run starts.
 */
export function useGiftIdeasState({
  recipientId,
  occasionId,
  listEmpty,
  focused,
  clientGenerating,
  loadFailed,
  mayRequestIdeas,
}: {
  recipientId: string | undefined;
  occasionId: string | null;
  /** No gift card is visible, so the empty state is what's on screen. */
  listEmpty: boolean;
  focused: boolean;
  clientGenerating: boolean;
  /** The suggestions fetch failed with nothing cached. */
  loadFailed: boolean;
  /** Suggestions have loaded and no removed slot is waiting on its
   * replacement, so an empty list really means the occasion has no set. */
  mayRequestIdeas: boolean;
}): {
  emptyState: GiftIdeasEmptyState;
  stateOccasionType: string | null;
  /** Occasions haven't loaded yet, so the empty state isn't known. */
  loading: boolean;
  /** Starts a fresh run for an occasion whose last one failed. */
  retryGeneration: (() => void) | undefined;
  /** A generating list's run will push when ready: only the screen's own
   * add-flow or profile-save run is known to. */
  notifiesWhenReady: boolean;
} {
  const queryClient = useQueryClient();
  const [mountedAt] = useState(() => Date.now());
  const { data: preferences } = useUserPreferences();
  // Always re-read on open: a cached copy from before a run started would
  // otherwise settle the screen on not-due while gifts are being generated.
  const {
    data: occasions,
    dataUpdatedAt,
    isPending,
    isError,
    isFetchedAfterMount,
  } = useRecipientOccasions(recipientId, { refetchOnMount: "always" });

  // `now` is the last fetch time, not the render time: pure, and it advances
  // with every poll, so a start stamp that goes stale mid-visit flips to failed.
  const now = dataUpdatedAt;
  const list = occasions ?? [];
  const occasion = occasionId
    ? (list.find((o) => o.id === occasionId) ?? null)
    : pickStateOccasion(list, now);
  // A screen-started run generates only one occasion, so a list filtered to
  // any other one isn't generating because of it. The target is picked the way
  // /api/generate-gifts picks it — soonest stored date on or after today in
  // UTC — not by next occurrence, since an annual row keeps last year's date
  // until the cron re-dates it.
  const todayUtc = new Date(now).toISOString().slice(0, 10);
  const runTargetId = list
    .filter((o) => o.date && o.date >= todayUtc)
    .sort((a, b) => (a.date as string).localeCompare(b.date as string))[0]?.id;
  const runCoversList =
    clientGenerating &&
    (!occasionId || !occasions || occasionId === runTargetId);

  // Per occasion, this visit's ask: waiting to send or in flight, answered,
  // or never answered.
  const [requests, setRequests] = useState<
    Record<string, "pending" | "done" | "failed">
  >({});
  const sentRef = useRef(new Set<string>());
  const request = occasion ? requests[occasion.id] : undefined;
  const askable =
    !!recipientId &&
    listEmpty &&
    mayRequestIdeas &&
    !loadFailed &&
    focused &&
    !runCoversList &&
    request === undefined &&
    canRequestGiftIdeas(occasion, now);
  // Only on this visit's occasions read: a cached row can predate a run that
  // has since started or finished. Until it lands the list reads as loading,
  // not as generating, so nothing promises a run that may never be asked for.
  const wantsIdeas = askable && isFetchedAfterMount;
  const awaitingFreshRead = askable && !isFetchedAfterMount;
  // Marked during render; the effect below sends it.
  if (wantsIdeas && occasion) {
    setRequests((prev) => ({ ...prev, [occasion.id]: "pending" }));
  }
  const listLoadFailed = loadFailed || (isError && !occasions);
  // A request that errored client-side may still have reached the server:
  // once its run shows in flight, that run is the truth.
  const requestFailed =
    request === "failed" &&
    !(occasion !== null && isGenerationInFlight(occasion, now));
  const emptyState = giftIdeasEmptyState({
    occasion,
    leadDays: preferences?.notification_lead_days ?? DEFAULT_LEAD_DAYS,
    remindersEnabled: preferences?.occasion_reminders_enabled !== false,
    clientGenerating: runCoversList || wantsIdeas || request === "pending",
    loadFailed: listLoadFailed || requestFailed,
    now,
  });
  const retryGeneration =
    emptyState === "failed" && !listLoadFailed && occasion
      ? () => {
          sentRef.current.delete(occasion.id);
          setRequests((prev) => ({ ...prev, [occasion.id]: "pending" }));
        }
      : undefined;

  useEffect(() => {
    if (!recipientId) return;
    for (const [target, state] of Object.entries(requests)) {
      if (state !== "pending" || sentRef.current.has(target)) continue;
      sentRef.current.add(target);
      requestGiftIdeas(recipientId, target).then(async (ok) => {
        // The occasions read must follow the response: the server claims the
        // in-flight stamp before answering, so this read shows the run.
        await queryClient.refetchQueries(
          { queryKey: queryKeys.recipientOccasions(recipientId), exact: true },
          { cancelRefetch: false }
        );
        await queryClient.refetchQueries(
          { queryKey: queryKeys.giftSuggestions(recipientId), exact: true },
          { cancelRefetch: false }
        );
        setRequests((prev) => ({ ...prev, [target]: ok ? "done" : "failed" }));
      });
    }
  }, [requests, recipientId, queryClient]);

  const shouldPoll =
    !!recipientId &&
    focused &&
    listEmpty &&
    (emptyState === "generating" || emptyState === "scheduled") &&
    (runCoversList ||
      (occasion !== null && isGenerationInFlight(occasion, now)) ||
      // `now` only advances on a successful fetch, so a failing one must not
      // hold the cap open.
      (!isError && now - mountedAt < UNSTARTED_POLL_MAX_MS));

  useEffect(() => {
    if (!isFetchedAfterMount || !recipientId) return;
    queryClient.refetchQueries(
      { queryKey: queryKeys.giftSuggestions(recipientId), exact: true },
      { cancelRefetch: false }
    );
  }, [isFetchedAfterMount, recipientId, queryClient]);

  useEffect(() => {
    if (!shouldPoll || !recipientId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    // Chained rather than an interval so a slow tick is never overlapped by
    // the next one cancelling its fetches. A tick whose occasions read ends
    // polling still finishes its suggestions read.
    const tick = async () => {
      await queryClient.refetchQueries(
        { queryKey: queryKeys.recipientOccasions(recipientId), exact: true },
        { cancelRefetch: false }
      );
      await queryClient.refetchQueries(
        { queryKey: queryKeys.giftSuggestions(recipientId), exact: true },
        { cancelRefetch: false }
      );
      if (!stopped) timer = setTimeout(tick, GIFT_STATE_POLL_MS);
    };
    timer = setTimeout(tick, GIFT_STATE_POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [shouldPoll, recipientId, queryClient]);

  return {
    emptyState,
    stateOccasionType: occasion?.occasion_type ?? null,
    loading:
      (isPending && !!recipientId && !clientGenerating) || awaitingFreshRead,
    retryGeneration,
    notifiesWhenReady: runCoversList,
  };
}
