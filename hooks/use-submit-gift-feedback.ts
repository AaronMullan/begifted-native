import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import {
  insertGiftFeedback,
  type GiftFeedbackAction,
  type InsertGiftFeedbackInput,
} from "../lib/api";
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
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.giftFeedback(vars.recipientId),
      });
    },
  });
}
