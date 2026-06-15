import { useState, useEffect } from "react";
import * as Sentry from "@sentry/react-native";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
}

function syncSentryUser(user: User | null) {
  if (user) {
    // Attach email/name so bug reports (DEV-96) are tied to a person without
    // the tester having to type those fields — the feedback widget hides its
    // name/email inputs and pulls identity from here instead.
    const metadata = user.user_metadata ?? {};
    const username =
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
        ? metadata.name
        : undefined;
    Sentry.setUser({
      id: user.id,
      email: user.email ?? undefined,
      username,
    });
  } else {
    Sentry.setUser(null);
  }
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      syncSentryUser(sessionUser);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      syncSentryUser(sessionUser);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
