import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteOccasion,
  updateOccasion,
  createOccasion,
  fetchRecipientOccasions,
} from "../lib/api";
import { queryKeys } from "../lib/query-keys";
import { makeMutationHandlers } from "../lib/mutation-handlers";
import { useAuth } from "./use-auth";

/**
 * Hook to fetch occasions for a specific recipient
 */
export function useRecipientOccasions(recipientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.recipientOccasions(recipientId || ""),
    queryFn: () => fetchRecipientOccasions(recipientId!),
    enabled: !!recipientId,
  });
}

type UpdateOccasionVariables = {
  occasionId: string;
  recipientId: string;
  fields: { date?: string; occasion_type?: string; is_annual?: boolean };
};

/**
 * Hook to update an occasion
 */
export function useUpdateOccasion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      occasionId,
      fields,
    }: UpdateOccasionVariables): Promise<void> => {
      await updateOccasion(occasionId, fields);
    },
    ...makeMutationHandlers<void, UpdateOccasionVariables>({
      queryClient,
      label: "useUpdateOccasion",
      errorMessage: "Couldn't save the occasion. Please try again.",
      invalidateKeys: (_, variables) => [
        ...(user ? [queryKeys.occasions(user.id)] : []),
        queryKeys.recipientOccasions(variables.recipientId),
      ],
    }),
  });
}

type CreateOccasionVariables = {
  recipientId: string;
  date: string;
  occasionType: string;
  isAnnual?: boolean;
};

/**
 * Hook to create a new occasion
 */
export function useCreateOccasion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      recipientId,
      date,
      occasionType,
      isAnnual = true,
    }: CreateOccasionVariables) => {
      if (!user) throw new Error("Not authenticated");
      return createOccasion(user.id, recipientId, date, occasionType, isAnnual);
    },
    ...makeMutationHandlers<unknown, CreateOccasionVariables>({
      queryClient,
      label: "useCreateOccasion",
      errorMessage: "Couldn't add the occasion. Please try again.",
      invalidateKeys: (_, variables) => [
        ...(user ? [queryKeys.occasions(user.id)] : []),
        queryKeys.recipientOccasions(variables.recipientId),
      ],
    }),
  });
}

type DeleteOccasionVariables = {
  occasionId: string;
  recipientId: string;
};

/**
 * Hook to delete an occasion
 */
export function useDeleteOccasion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      occasionId,
    }: DeleteOccasionVariables): Promise<void> => {
      await deleteOccasion(occasionId);
    },
    ...makeMutationHandlers<void, DeleteOccasionVariables>({
      queryClient,
      label: "useDeleteOccasion",
      errorMessage: "Couldn't delete the occasion. Please try again.",
      invalidateKeys: (_, variables) => [
        ...(user ? [queryKeys.occasions(user.id)] : []),
        queryKeys.recipientOccasions(variables.recipientId),
      ],
    }),
  });
}
