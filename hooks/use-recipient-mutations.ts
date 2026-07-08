import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { queryKeys } from "../lib/query-keys";
import { makeMutationHandlers } from "../lib/mutation-handlers";
import type { Recipient } from "../types/recipient";
import { normalizeBirthday } from "../utils/birthday";

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
      const safeData =
        "birthday" in data
          ? { ...data, birthday: normalizeBirthday(data.birthday) }
          : data;
      const { data: recipient, error } = await supabase
        .from("recipients")
        .insert([safeData])
        .select()
        .single();

      if (error) throw error;
      return recipient;
    },
    ...makeMutationHandlers<Recipient, CreateRecipientData>({
      queryClient,
      label: "useCreateRecipient",
      errorMessage: "Couldn't save this person. Please try again.",
      // Dashboard derives from recipients and occasions
      invalidateKeys: (_, variables) => [
        queryKeys.recipients(variables.user_id),
        queryKeys.occasions(variables.user_id),
      ],
    }),
  });
}

type UpdateRecipientVariables = {
  userId: string;
  recipientId: string;
  data: UpdateRecipientData;
};

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
    }: UpdateRecipientVariables): Promise<Recipient> => {
      const safeData =
        "birthday" in data
          ? { ...data, birthday: normalizeBirthday(data.birthday) }
          : data;
      const { data: recipient, error } = await supabase
        .from("recipients")
        .update({
          ...safeData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipientId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return recipient;
    },
    ...makeMutationHandlers<Recipient, UpdateRecipientVariables>({
      queryClient,
      label: "useUpdateRecipient",
      errorMessage: "Couldn't save your changes. Please try again.",
      // Dashboard derives from recipients and occasions
      invalidateKeys: (_, variables) => [
        queryKeys.recipients(variables.userId),
        queryKeys.recipient(variables.userId, variables.recipientId),
        queryKeys.occasions(variables.userId),
      ],
      afterSuccess: (_, variables) => {
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
    }),
  });
}

type DeleteRecipientVariables = {
  userId: string;
  recipientId: string;
};

/**
 * Hook to delete a recipient
 */
export function useDeleteRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      recipientId,
    }: DeleteRecipientVariables): Promise<void> => {
      const { error } = await supabase
        .from("recipients")
        .delete()
        .eq("id", recipientId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    ...makeMutationHandlers<void, DeleteRecipientVariables>({
      queryClient,
      label: "useDeleteRecipient",
      errorMessage: "Couldn't delete this person. Please try again.",
      // Dashboard derives from recipients and occasions; gift suggestions
      // for the deleted recipient are stale too
      invalidateKeys: (_, variables) => [
        queryKeys.recipients(variables.userId),
        queryKeys.recipient(variables.userId, variables.recipientId),
        queryKeys.occasions(variables.userId),
        queryKeys.giftSuggestions(variables.recipientId),
      ],
    }),
  });
}
