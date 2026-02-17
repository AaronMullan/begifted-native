import { Session } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import Auth from "../components/Auth";

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // Check auth session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;

        setSession(session);
        setLoading(false);

        // Redirect to dashboard if logged in
        if (session?.user) {
          router.replace("/dashboard");
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);

      // Redirect to dashboard if logged in
      if (session?.user) {
        router.replace("/dashboard");
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
