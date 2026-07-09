import { useMutation } from "@tanstack/react-query";
import { insertBetaFeedback, type BetaCheckInScreen } from "../lib/api";
import { useAuth } from "./use-auth";

type SubmitBetaFeedbackVars = {
  screen: BetaCheckInScreen;
  responses: Record<string, string>;
  freeText?: string | null;
};

/**
 * Submit a beta UX check-in response (DEV-191). Append-only, no cache
 * invalidation — nothing in the app reads these rows back. Errors are logged,
 * not surfaced: a failed submit must never trap a tester in the check-in card.
 */
export function useSubmitBetaFeedback() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: (vars: SubmitBetaFeedbackVars) => {
      if (!user) throw new Error("Must be signed in to submit beta feedback");
      return insertBetaFeedback({
        user_id: user.id,
        screen: vars.screen,
        responses: vars.responses,
        free_text: vars.freeText ?? null,
      });
    },
    onError: (err) => console.error("useSubmitBetaFeedback failed:", err),
  });
}
