import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { queryKeys } from "../lib/query-keys";
import type { Profile } from "../lib/api";

interface UpdateProfileData {
  username?: string | null;
  full_name?: string | null;
  name?: string | null;
  billing_address_street?: string | null;
  billing_address_city?: string | null;
  billing_address_state?: string | null;
  billing_address_zip?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
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
      const { data: profile, error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          ...data,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return profile;
    },
    onSuccess: (_, variables) => {
      // Invalidate profile and dashboard stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardStats(variables.userId),
      });
    },
  });
}
