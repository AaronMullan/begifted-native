import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRecipientOccasions } from "./use-occasion-mutations";
import { useUserPreferences } from "./use-user-preferences";
import { queryKeys } from "../lib/query-keys";
import {
  DEFAULT_LEAD_DAYS,
  giftIdeasEmptyState,
  isGenerationInFlight,
  pickStateOccasion,
} from "../components/gifts/gift-ideas-state";
import type { GiftIdeasEmptyState } from "../components/gifts/gift-ideas-state";

export const GIFT_STATE_POLL_MS = 10000;

/** How long to keep watching an in-window occasion that has no run yet. The
 * add flow's run stamps within seconds; past this, the next one is the daily
 * cron, which isn't worth polling for. */
const UNSTARTED_POLL_MAX_MS = 5 * 60 * 1000;

/**
 * Server-derived state for an empty Gift Ideas list, for the occasion the list
 * is filtered to (or the recipient's most relevant one when unfiltered).
 *
 * While an empty, focused list is generating it re-fetches suggestions and
 * then occasions on one timer. The order matters: a run stores its gifts
 * before it clears its stamp, so fresh suggestions paired with occasions read
 * after them can never show a finished run next to a stale empty list.
 */
export function useGiftIdeasState({
  recipientId,
  occasionId,
  listEmpty,
  focused,
  clientGenerating,
  loadFailed,
}: {
  recipientId: string | undefined;
  occasionId: string | null;
  /** No gift card is visible, so the empty state is what's on screen. */
  listEmpty: boolean;
  focused: boolean;
  clientGenerating: boolean;
  /** The suggestions fetch failed with nothing cached. */
  loadFailed: boolean;
}): {
  emptyState: GiftIdeasEmptyState;
  stateOccasionType: string | null;
  /** Occasions haven't loaded yet, so the empty state isn't known. */
  loading: boolean;
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
  } = useRecipientOccasions(recipientId, { refetchOnMount: "always" });

  // `now` is the last fetch time, not the render time: pure, and it advances
  // with every poll, so a start stamp that goes stale mid-visit flips to failed.
  const now = dataUpdatedAt;
  const list = occasions ?? [];
  const occasion = occasionId
    ? (list.find((o) => o.id === occasionId) ?? null)
    : pickStateOccasion(list, now);
  const emptyState = giftIdeasEmptyState({
    occasion,
    leadDays: preferences?.notification_lead_days ?? DEFAULT_LEAD_DAYS,
    remindersEnabled: preferences?.occasion_reminders_enabled !== false,
    clientGenerating,
    loadFailed: loadFailed || (isError && !occasions),
    now,
  });

  const shouldPoll =
    !!recipientId &&
    focused &&
    listEmpty &&
    emptyState === "generating" &&
    (clientGenerating ||
      (occasion !== null && isGenerationInFlight(occasion, now)) ||
      now - mountedAt < UNSTARTED_POLL_MAX_MS);

  useEffect(() => {
    if (!shouldPoll || !recipientId) return;
    const timer = setInterval(async () => {
      await queryClient.refetchQueries({
        queryKey: queryKeys.giftSuggestions(recipientId),
        exact: true,
      });
      await queryClient.refetchQueries({
        queryKey: queryKeys.recipientOccasions(recipientId),
        exact: true,
      });
    }, GIFT_STATE_POLL_MS);
    return () => clearInterval(timer);
  }, [shouldPoll, recipientId, queryClient]);

  return {
    emptyState,
    stateOccasionType: occasion?.occasion_type ?? null,
    loading: isPending && !!recipientId && !clientGenerating,
  };
}
