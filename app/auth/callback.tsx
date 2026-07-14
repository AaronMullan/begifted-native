import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import GradientBackground from "../../components/GradientBackground";
import { Colors } from "../../lib/colors";

// Landing spot for the email-verification deep link. The client signs up with
// the PKCE flow, so Supabase's verify endpoint redirects here with either a
// ?code= to exchange for a session or error query params (e.g.
// error_code=otp_expired for a reused or expired link).
export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error_description?: string;
  }>();
  const [failedCode, setFailedCode] = useState<string | null>(null);
  // Keyed on the incoming code (not a one-shot flag) so a fresh link tapped
  // after a failed one is still processed, while re-renders can't double-spend
  // the same one-time code.
  const handledCode = useRef<string | null>(null);

  const code = typeof params.code === "string" ? params.code : null;
  const errorDescription =
    typeof params.error_description === "string"
      ? params.error_description
      : null;

  // Derived during render: a new code arriving clears the previous failure
  // (failedCode no longer matches), so no state reset is needed.
  let errorMessage: string | null = null;
  if (code && failedCode === code) {
    // The verify endpoint confirms the email before redirecting here, so an
    // exchange failure (cleared storage, different device) still leaves the
    // account verified — signing in is the recovery path.
    errorMessage =
      "Your email is likely verified, but we couldn't sign you in automatically. Please sign in with your email and password.";
  } else if (!code) {
    errorMessage =
      errorDescription ?? "This verification link is invalid or has expired.";
  }

  useEffect(() => {
    if (!code || handledCode.current === code) return;
    handledCode.current = code;

    async function establishSession(authCode: string) {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);
        if (error) throw error;
        // app/index.tsx routes the fresh session into onboarding (or the
        // dashboard for returning users).
        router.replace("/");
      } catch {
        setFailedCode(authCode);
      }
    }

    void establishSession(code);
  }, [code, router]);

  return (
    <View style={styles.root}>
      <GradientBackground />
      <View style={styles.content}>
        {errorMessage ? (
          <>
            <Text variant="titleMedium" style={styles.title}>
              We couldn&apos;t verify your email
            </Text>
            <Text variant="bodyMedium" style={styles.body}>
              {errorMessage}
            </Text>
            <Button
              mode="contained"
              onPress={() => router.replace("/")}
              buttonColor={Colors.brand.buttonTeal}
              textColor={Colors.white}
              style={styles.button}
            >
              Go to sign in
            </Button>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={Colors.brand.darkTeal} />
            <Text variant="bodyMedium" style={styles.body}>
              Verifying your email…
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  title: {
    color: Colors.brand.darkTeal,
    textAlign: "center",
  },
  body: {
    color: Colors.brand.darkTeal,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
  },
});
