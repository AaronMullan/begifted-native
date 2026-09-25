import { useRecipientOccasions } from "./use-occasion-mutations";
import { useUserPreferences } from "./use-user-preferences";
import { useGiftSuggestions } from "./use-gift-suggestions";
import {
  DEFAULT_LEAD_DAYS,
  giftIdeasEmptyState,
  pickStateOccasion,
} from "../components/gifts/gift-ideas-state";
import type { GiftIdeasEmptyState } from "../components/gifts/gift-ideas-state";
import type { Occasion } from "../lib/api/occasions";

export const GIFT_STATE_POLL_MS = 10000;

/**
 * Server-derived state for an empty Gift Ideas list, for the occasion the list
 * is filtered to (or the recipient's most relevant one when unfiltered).
 * While an empty list is generating it polls the recipient's occasions and,
 * through a second observer on the shared suggestions query, the suggestions,
 * so the screen settles on its own once the run lands.
 */
export function useGiftIdeasState({
  recipientId,
  occasionId,
  listEmpty,
  clientGenerating,
  loadFailed,
}: {
  recipientId: string | undefined;
  occasionId: string | null;
  /** No gift card is visible, so the empty state is what's on screen. */
  listEmpty: boolean;
  clientGenerating: boolean;
  loadFailed: boolean;
}): {
  emptyState: GiftIdeasEmptyState;
  stateOccasionType: string | null;
} {
  const { data: preferences } = useUserPreferences();
  const leadDays = preferences?.notification_lead_days ?? DEFAULT_LEAD_DAYS;
  const remindersEnabled = preferences?.occasion_reminders_enabled !== false;

  // `now` is the last fetch time, not the render time: pure, and it advances
  // with every poll, so a start stamp that goes stale mid-visit flips to failed.
  const resolve = (occasions: Occasion[], now: number) => {
    const occasion = occasionId
      ? (occasions.find((o) => o.id === occasionId) ?? null)
      : pickStateOccasion(occasions, now);
    return {
      occasion,
      emptyState: giftIdeasEmptyState({
        occasion,
        leadDays,
        remindersEnabled,
        clientGenerating,
        loadFailed,
        now,
      }),
    };
  };

  const { data: occasions = [], dataUpdatedAt } = useRecipientOccasions(
    recipientId,
    {
      refetchInterval: (query) =>
        listEmpty &&
        resolve(query.state.data ?? [], query.state.dataUpdatedAt)
          .emptyState === "generating"
          ? GIFT_STATE_POLL_MS
          : false,
    }
  );

  const { occasion, emptyState } = resolve(occasions, dataUpdatedAt);
  useGiftSuggestions(recipientId, {
    refetchInterval:
      listEmpty && emptyState === "generating" ? GIFT_STATE_POLL_MS : false,
  });

  return {
    emptyState,
    stateOccasionType: occasion?.occasion_type ?? null,
  };
}
