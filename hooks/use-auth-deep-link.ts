import { useEffect } from "react";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";

/**
 * Hook to handle magic link deep linking for authentication.
 * Listens for incoming URLs and automatically signs in the user
 * when a magic link is clicked.
 */
export function useAuthDeepLink() {
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      try {
        const { queryParams } = Linking.parse(url);

        // Check if this is an auth callback with tokens
        if (queryParams?.access_token && queryParams?.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: queryParams.access_token as string,
            refresh_token: queryParams.refresh_token as string,
          });

          if (error) {
            console.error("Error setting session from deep link:", error);
          } else {
            console.log("Successfully authenticated via deep link");
          }
        }
      } catch (error) {
        console.error("Error handling deep link:", error);
      }
    };

    // Listen for incoming links while app is open
    const subscription = Linking.addEventListener("url", handleUrl);

    // Handle URL if app was opened from a link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
