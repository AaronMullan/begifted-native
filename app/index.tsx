import type { Session } from "@supabase/supabase-js";
import { useState, useEffect, useRef } from "react";
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

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function handleSession(session: Session | null) {
      if (!isMounted || hasNavigated.current) return;

      setSession(session);

      if (session?.user) {
        try {
          const { data } = await supabase
            .from("user_preferences")
            .select("onboarding_completed")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!isMounted || hasNavigated.current) return;

          hasNavigated.current = true;
          const route = data?.onboarding_completed
            ? "/dashboard"
            : "/onboarding/welcome";
          router.replace(route as Href);
        } catch {
          if (!isMounted || hasNavigated.current) return;
          hasNavigated.current = true;
          router.replace("/onboarding/welcome" as Href);
        }
      } else {
        setLoading(false);
      }
    }

    // Check auth session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => handleSession(session))
      .catch((error) => {
        console.error("Error checking auth session:", error);
        if (isMounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // Keep showing loading until redirect completes for authenticated users
  if (loading) {
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

  // Authenticated but waiting for redirect — keep loading
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
