import type { Session } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import Auth from "../components/Auth";

async function resolvePostAuthRoute(userId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("user_preferences")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.onboarding_completed) {
      return "/dashboard";
    }
    return "/onboarding/welcome";
  } catch {
    return "/onboarding/welcome";
  }
}

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // Check auth session
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!isMounted) return;

        setSession(session);
        setLoading(false);

        if (session?.user) {
          const route = await resolvePostAuthRoute(session.user.id);
          if (isMounted) router.replace(route as Href);
        }
      })
      .catch((error) => {
        console.error("Error checking auth session:", error);
        if (!isMounted) return;

        // On error, still show auth screen
        setSession(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      setSession(session);

      if (session?.user) {
        const route = await resolvePostAuthRoute(session.user.id);
        if (isMounted) router.replace(route as Href);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // Show loading screen while checking auth - splash screen should be visible
  // On web, we also show a fallback loading screen since splash screens work differently
  if (loading) {
    // On native, splash screen is visible, so return null
    // On web, show a loading screen as fallback
    if (Platform.OS === "web") {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      );
    }
    return null;
  }

  // Show auth component if not logged in
  if (!session || !session.user) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Auth />
      </ScrollView>
    );
  }

  // This shouldn't render if redirect works, but just in case
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
});
