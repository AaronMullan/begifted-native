import { Session } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { supabase } from "../lib/supabase";
import DashBoard from "../components/LoggedIn";
import Hero from "../components/Hero";
import ContentBlock from "../components/ContentBlock";
import BrandGrid from "../components/BrandGrid";

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

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

  // Show your existing content if logged in
  return (
    <ScrollView>
      <DashBoard />
    </ScrollView>
  );
}
