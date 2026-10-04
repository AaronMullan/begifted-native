import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { Occasion } from "../lib/api/occasions";
import {
  deleteOccasion,
  updateOccasion,
  syncBirthdayOccasion,
  createOccasion,
  fetchRecipientOccasions,
  logProductEvent,
  DuplicateOccasionError,
} from "../lib/api";
import { queryKeys } from "../lib/query-keys";
import { makeMutationHandlers } from "../lib/mutation-handlers";
import { StateCopy } from "../lib/state-copy";
import { useAuth } from "./use-auth";

/**
 * Hook to fetch occasions for a specific recipient
 */
export function useRecipientOccasions(
  recipientId: string | undefined,
  options?: Pick<UseQueryOptions<Occasion[], Error>, "refetchOnMount">
) {
  return useQuery({
    queryKey: queryKeys.recipientOccasions(recipientId || ""),
    queryFn: () => fetchRecipientOccasions(recipientId!),
    enabled: !!recipientId,
    refetchOnMount: options?.refetchOnMount,
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
      errorMessage: StateCopy.saveFailed("the moment"),
      invalidateKeys: (_, variables) => [
        ...(user ? [queryKeys.occasions(user.id)] : []),
        queryKeys.recipientOccasions(variables.recipientId),
      ],
    }),
  });
}

type SyncBirthdayOccasionVariables = {
  recipientId: string;
  /** Null when the birthday was removed. */
  birthday: string | null;
};

/**
 * Hook to create, move or remove a recipient's birthday moment after their
 * birthday changes
 */
export function useSyncBirthdayOccasion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      recipientId,
      birthday,
    }: SyncBirthdayOccasionVariables): Promise<void> => {
      if (!user) throw new Error("Not authenticated");
      await syncBirthdayOccasion(user.id, recipientId, birthday);
    },
    ...makeMutationHandlers<void, SyncBirthdayOccasionVariables>({
      queryClient,
      label: "useSyncBirthdayOccasion",
      errorMessage: StateCopy.saveFailed("their new birthday"),
      invalidateKeys: (_, variables) => [
        ...(user ? [queryKeys.occasions(user.id)] : []),
        queryKeys.recipientOccasions(variables.recipientId),
      ],
    }),
  });
}

type CreateOccasionVariables = {
  recipientId: string;
  date: string | null;
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
      // "Try again" would be a lie for a duplicate — the same insert can
      // never succeed while the moment exists.
      errorMessage: (error) =>
        error instanceof DuplicateOccasionError
          ? error.message
          : StateCopy.saveFailed("the moment"),
      invalidateKeys: (_, variables) => [
        ...(user ? [queryKeys.occasions(user.id)] : []),
        queryKeys.recipientOccasions(variables.recipientId),
      ],
      afterSuccess: (_, variables) => {
        if (user) {
          logProductEvent(user.id, "occasion_added", {
            recipient_id: variables.recipientId,
            occasion_type: variables.occasionType,
            source: "manual",
          });
        }
      },
    }),
  });
}

type DeleteOccasionVariables = {
  occasionId: string;
  recipientId: string;
  /** Names the occasion in the failure message, as the confirm dialog did. */
  name: string;
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
      errorMessage: (_, variables) => StateCopy.deleteFailed(variables.name),
      invalidateKeys: (_, variables) => [
        ...(user ? [queryKeys.occasions(user.id)] : []),
        queryKeys.recipientOccasions(variables.recipientId),
      ],
    }),
  });
}
