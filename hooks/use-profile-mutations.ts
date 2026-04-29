import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { queryKeys } from "../lib/query-keys";
import type { Profile } from "../lib/api";

interface UpdateProfileData {
  full_name?: string | null;
  billing_address_city?: string | null;
  billing_address_state?: string | null;
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

      if ("billing_address_city" in data) payload.billing_address_city = data.billing_address_city ?? null;
      if ("billing_address_state" in data) payload.billing_address_state = data.billing_address_state ?? null;

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
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile(variables.userId),
      });

      // Re-synthesize giver profile in the background when location changes
      const locationChanged =
        "billing_address_city" in variables.data ||
        "billing_address_state" in variables.data;
      if (locationChanged) {
        supabase.functions
          .invoke("synthesize-giver-profile", { body: { userId: variables.userId } })
          .catch((err) => console.error("Failed to trigger giver profile synthesis:", err));
      }
    },
    onError: (error) => console.error("useUpdateProfile failed:", error),
  });
}
