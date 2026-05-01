import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAppConfig, updateAppConfig } from "@/lib/api";
import type { AppConfig } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";

export function useAppConfig() {
  return useQuery({
    queryKey: queryKeys.appConfig,
    queryFn: fetchAppConfig,
    staleTime: 30_000,
  });
}

export function useUpdateAppConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (
      flags: Partial<
        Pick<
          AppConfig,
          | "recommendations_enabled"
          | "notifications_enabled"
          | "signups_enabled"
          | "ai_provider"
          | "ai_model"
        >
      >
    ) => updateAppConfig(flags, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appConfig });
    },
  });
}
