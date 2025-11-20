import { Session } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import Hero from "../components/Hero";
import ContentBlock from "../components/ContentBlock";
import BrandGrid from "../components/BrandGrid";

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      // Redirect to dashboard if logged in
      if (session?.user) {
        router.replace("/dashboard");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Redirect to dashboard if logged in
      if (session?.user) {
        router.replace("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading state while checking session
  if (loading) {
    return null;
  }

  // Show auth components if not logged in
  if (!session || !session.user) {
    return (
      <ScrollView>
        <Hero />
        <ContentBlock />
        <BrandGrid />
      </ScrollView>
    );
  }

  // This shouldn't render if redirect works, but just in case
  return null;
}
