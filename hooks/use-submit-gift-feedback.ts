import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import {
  GIFT_REMOVAL_ACTIONS,
  insertGiftFeedback,
  triggerGiftBackfill,
  type GiftFeedbackAction,
  type InsertGiftFeedbackInput,
} from "../lib/api";
import type { GiftSuggestion } from "../types/recipient";
import { useAuth } from "./use-auth";

type SubmitGiftFeedbackVars = {
  recipientId: string;
  giftSuggestionId: string;
  action: GiftFeedbackAction;
  occasionId?: string | null;
  notes?: string | null;
};

/** Target number of active gift ideas the list backfills toward (DEV-118). */
const VISIBLE_TARGET = 3;

/** Rows holding one of the recipient's active slots. Scoped recipient-wide to
 * match the deficit the backfill endpoint computes. */
const activeCount = (rows: GiftSuggestion[]) =>
  rows.filter((s) => s.active_in_recipient).length;

/**
 * After triggering a backfill, the backend generation runs async (seconds), so
 * refetch the suggestions a few times until the replacement lands or we give up.
 * Bounded so a recipient the model can't fill a 3rd idea for won't poll forever.
 */
function pollForBackfill(queryClient: QueryClient, recipientId: string) {
  const key = queryKeys.giftSuggestions(recipientId);
  const delaysMs = [8000, 16000, 25000, 35000, 50000];
  for (const delay of delaysMs) {
    setTimeout(() => {
      const current = queryClient.getQueryData<GiftSuggestion[]>(key) ?? [];
      if (activeCount(current) >= VISIBLE_TARGET) return; // already refilled
      queryClient.invalidateQueries({ queryKey: key });
    }, delay);
  }
}

export function useSubmitGiftFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: SubmitGiftFeedbackVars) => {
      if (!user) throw new Error("Must be signed in to submit feedback");
      const payload: InsertGiftFeedbackInput = {
        user_id: user.id,
        recipient_id: vars.recipientId,
        gift_suggestion_id: vars.giftSuggestionId,
        action: vars.action,
        occasion_id: vars.occasionId ?? null,
        notes: vars.notes ?? null,
      };
      return insertGiftFeedback(payload);
    },
    // Optimistically drop the acted-on gift from the visible list so the user
    // sees their feedback took effect immediately (DEV-108). `fetchGiftSuggestions`
    // keeps it hidden on refetch, so this is just for instant UX.
    onMutate: async (vars) => {
      if (!GIFT_REMOVAL_ACTIONS.includes(vars.action)) return;
      const key = queryKeys.giftSuggestions(vars.recipientId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<GiftSuggestion[]>(key);
      queryClient.setQueryData<GiftSuggestion[]>(key, (old) =>
        (old ?? []).filter((s) => s.id !== vars.giftSuggestionId)
      );
      return { previous };
    },
    onError: (_err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.giftSuggestions(vars.recipientId),
          context.previous
        );
      }
    },
    // When a removal empties one of the three active slots, immediately ask the
    // backend to backfill the deficit and poll for the replacement to land
    // (DEV-118).
    onSuccess: (_data, vars) => {
      if (!GIFT_REMOVAL_ACTIONS.includes(vars.action)) return;
      const remaining =
        queryClient.getQueryData<GiftSuggestion[]>(
          queryKeys.giftSuggestions(vars.recipientId)
        ) ?? [];
      // Count active slots, not the whole list: a recipient with a Past Gifts
      // band always had 3+ rows left, so this gate used to swallow every
      // removal they made and no replacement was ever requested (DEV-488).
      if (activeCount(remaining) >= VISIBLE_TARGET) return;
      triggerGiftBackfill(vars.recipientId, vars.occasionId);
      pollForBackfill(queryClient, vars.recipientId);
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.giftFeedback(vars.recipientId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.giftSuggestions(vars.recipientId),
      });
    },
  });
}
