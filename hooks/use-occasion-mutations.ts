import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteOccasion, fetchRecipientOccasions } from "../lib/api";
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
