import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { queryKeys } from "../lib/query-keys";
import type { Profile } from "../lib/api";

interface UpdateProfileData {
  full_name?: string | null;
  updated_at?: string;
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: UpdateProfileData;
    }): Promise<Profile> => {
      // Use update instead of upsert - profile row should exist from signup trigger.
      // Only send full_name (omit username to avoid min-3-char constraint).
      const payload: Record<string, unknown> = {
        full_name: data.full_name ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data: profile, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", userId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return profile as Profile;
    },
    onSuccess: (_, variables) => {
      // Invalidate profile and dashboard stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile(variables.userId),
      });
    },
  });
}
