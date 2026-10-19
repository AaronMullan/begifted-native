import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import {
  readUnfinishedPeople,
  removeUnfinishedPerson,
} from "../lib/pending-contact-queue";
import { useAuth } from "./use-auth";

export function useUnfinishedPeople() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.unfinishedPeople(user?.id ?? ""),
    queryFn: () => readUnfinishedPeople(user!.id),
    enabled: !!user,
  });
}

export function useRemoveUnfinishedPerson() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeUnfinishedPerson(user!.id, id),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.unfinishedPeople(user?.id ?? ""),
      }),
  });
}
