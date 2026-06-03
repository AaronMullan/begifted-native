import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import {
  GIFT_REMOVAL_ACTIONS,
  insertGiftFeedback,
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
