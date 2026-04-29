import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { queryKeys } from "../lib/query-keys";
import type { Recipient } from "../types/recipient";

interface CreateRecipientData {
  user_id: string;
  name: string;
  relationship_type: string;
  interests?: string[] | null;
  birthday?: string | null;
  emotional_tone_preference?: string | null;
  gift_budget_min?: number | null;
  gift_budget_max?: number | null;
  address?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
}

interface UpdateRecipientData {
  name?: string;
  relationship_type?: string;
  interests?: string[] | null;
  birthday?: string | null;
  emotional_tone_preference?: string | null;
  gift_budget_min?: number | null;
  gift_budget_max?: number | null;
  address?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
}

const PROFILE_RELEVANT_FIELDS: (keyof UpdateRecipientData)[] = [
  "interests",
  "birthday",
  "relationship_type",
  "emotional_tone_preference",
  "gift_budget_min",
  "gift_budget_max",
  "address",
  "city",
  "state",
  "zip_code",
  "country",
];

/**
 * Hook to create a new recipient
 */
export function useCreateRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRecipientData): Promise<Recipient> => {
      const { data: recipient, error } = await supabase
        .from("recipients")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return recipient;
    },
    onSuccess: (_, variables) => {
      // Invalidate recipients and occasions (dashboard derives from these)
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients(variables.user_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.occasions(variables.user_id),
      });
    },
    onError: (error) => console.error("useCreateRecipient failed:", error),
  });
}

/**
 * Hook to update a recipient
 */
export function useUpdateRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      recipientId,
      data,
    }: {
      userId: string;
      recipientId: string;
      data: UpdateRecipientData;
    }): Promise<Recipient> => {
      const { data: recipient, error } = await supabase
        .from("recipients")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipientId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return recipient;
    },
    onSuccess: (_, variables) => {
      // Invalidate recipients, detail, and occasions (dashboard derives from these)
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipient(variables.userId, variables.recipientId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.occasions(variables.userId),
      });

      // Re-synthesize profile in the background if any profile-relevant fields changed
      const needsResynthesis = PROFILE_RELEVANT_FIELDS.some(
        (field) => field in variables.data
      );
      if (needsResynthesis) {
        supabase.functions
          .invoke("synthesize-recipient-profile", {
            body: { recipientId: variables.recipientId },
          })
          .catch((err) => {
            console.error("Failed to trigger profile synthesis:", err);
          });
      }
    },
    onError: (error) => console.error("useUpdateRecipient failed:", error),
  });
}

/**
 * Hook to delete a recipient
 */
export function useDeleteRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      recipientId,
    }: {
      userId: string;
      recipientId: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from("recipients")
        .delete()
        .eq("id", recipientId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate recipients, detail, and occasions (dashboard derives from these)
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipients(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipient(variables.userId, variables.recipientId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.occasions(variables.userId),
      });
      // Also invalidate gift suggestions for this recipient
      queryClient.invalidateQueries({
        queryKey: queryKeys.giftSuggestions(variables.recipientId),
      });
    },
    onError: (error) => console.error("useDeleteRecipient failed:", error),
  });
}
