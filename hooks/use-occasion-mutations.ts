import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteOccasion, updateOccasion, createOccasion, fetchRecipientOccasions } from "../lib/api";
import { queryKeys } from "../lib/query-keys";
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
    }: {
      occasionId: string;
      recipientId: string;
      fields: { date?: string; occasion_type?: string };
    }): Promise<void> => {
      await updateOccasion(occasionId, fields);
    },
    onSuccess: (_, variables) => {
      if (user) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.occasions(user.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipientOccasions(variables.recipientId),
      });
    },
  });
}

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
    }: {
      recipientId: string;
      date: string;
      occasionType: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      return createOccasion(user.id, recipientId, date, occasionType);
    },
    onSuccess: (_, variables) => {
      if (user) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.occasions(user.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipientOccasions(variables.recipientId),
      });
    },
  });
}

/**
 * Hook to delete an occasion
 */
export function useDeleteOccasion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      occasionId,
    }: {
      occasionId: string;
      recipientId: string;
    }): Promise<void> => {
      await deleteOccasion(occasionId);
    },
    onSuccess: (_, variables) => {
      if (user) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.occasions(user.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipientOccasions(variables.recipientId),
      });
    },
  });
}
