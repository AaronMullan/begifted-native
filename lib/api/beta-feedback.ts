/**
 * Beta UX check-in feedback API (DEV-191). Append-only inserts from the in-app
 * "quick beta check-in" cards; schema in the *_create_beta_feedback.sql
 * migration. Structured radio answers plus an optional free-text line.
 */

import { supabase } from "../supabase";

export type BetaCheckInScreen =
  "onboarding" | "first_recipient" | "first_gift_set";

export interface InsertBetaFeedbackInput {
  user_id: string;
  screen: BetaCheckInScreen;
  responses: Record<string, string>;
  free_text?: string | null;
}

export async function insertBetaFeedback(
  input: InsertBetaFeedbackInput
): Promise<void> {
  const { error } = await supabase.from("beta_feedback").insert({
    user_id: input.user_id,
    screen: input.screen,
    responses: input.responses,
    free_text: input.free_text ?? null,
  });

  if (error) throw error;
}
