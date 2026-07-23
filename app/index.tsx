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
import { Colors } from "../lib/colors";
import GradientBackground from "../components/GradientBackground";
import { hasSeenIntro, markIntroSeen } from "../lib/intro-storage";
import { flushPendingLegalAcceptance } from "../lib/legal-acceptance";

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function routeAuthenticatedUser(session: Session) {
      // A session implies the user is past the pre-auth intro; set the gate
      // so a later sign-out returns them to <Auth />, not the slider.
      void markIntroSeen();
      // Signup via email verification couldn't record the legal acceptance
      // (no JWT yet); flush any stashed marker now that we have a session.
      void flushPendingLegalAcceptance();
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
    }

    async function routeUnauthenticated() {
      // The intro slider is touch-only (swipe paging, CTA on the last slide),
      // so on desktop web it strands signed-out users with no path to sign-in.
      // Web skips the intro gate and goes straight to <Auth />.
      if (Platform.OS === "web") {
        setLoading(false);
        return;
      }

      // First-launch users see the pre-auth intro slider; once the gate is set
      // (intro seen, or a prior session existed) we fall through to <Auth />.
      const seenIntro = await hasSeenIntro();
      if (!isMounted || hasNavigated.current) return;

      if (!seenIntro) {
        hasNavigated.current = true;
        router.replace("/intro");
        return;
      }

      setLoading(false);
    }

    async function handleSession(session: Session | null) {
      if (!isMounted || hasNavigated.current) return;

      setSession(session);

      if (session?.user) {
        await routeAuthenticatedUser(session);
      } else {
        await routeUnauthenticated();
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
          <GradientBackground />
          <ActivityIndicator size="large" color={Colors.brand.darkTeal} />
        </View>
      );
    }
    return null;
  }

  // Show auth component if not logged in
  if (!session || !session.user) {
    return (
      <View style={styles.container}>
        <GradientBackground />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          <Auth />
        </ScrollView>
      </View>
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
