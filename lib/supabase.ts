// CRITICAL: Polyfill MUST be imported first, before any other imports
// This ensures URL/fetch polyfills are available before Supabase initializes
import "react-native-url-polyfill/auto";

import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";

const supabaseUrl = "https://qgcyndtymegkobgfcpdh.supabase.co";
const supabaseAnonKey = "sb_publishable_zQoX48Kvts7b8XOViU-JXg_QNpr35lp";

// Where the verification email returns the user (handled by app/auth/callback.tsx).
// Must be listed in the Supabase dashboard's auth Redirect URLs allowlist —
// otherwise emailRedirectTo is silently ignored and the link falls back to the
// web Site URL, stranding the user in the browser.
export const EMAIL_CONFIRM_REDIRECT_URL = "begifted://auth/callback";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
    // PKCE makes the email-verification redirect carry the auth result as
    // query params (?code=...), which expo-router hands to app/auth/callback.tsx
    // on both cold and warm starts. The implicit flow's URL-fragment tokens are
    // unreliable on warm start (the Linking url event fires before the route
    // mounts). Web keeps implicit so links landing on the Site URL still work
    // with the web app's fragment-based session detection.
    flowType: Platform.OS === "web" ? "implicit" : "pkce",
  },
});

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
