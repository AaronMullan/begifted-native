import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase, EMAIL_CONFIRM_REDIRECT_URL } from "../lib/supabase";
import GradientBackground from "../components/GradientBackground";
import { Colors } from "../lib/colors";

// Where sign-up lands a user whose account still needs email verification.
// Both sign-up entry points (components/intro/IntroSignUp.tsx and
// components/Auth.tsx) route here instead of leaving the user on the sign-up
// form with only an inline message — the original stranding bug (DEV-420).
// The happy path (tapping the emailed link) still returns through
// app/auth/callback.tsx, which exchanges the code and replaces to "/"; this
// screen is the waiting room and the resend/recover path.
type ResendState = "idle" | "sending" | "sent" | "error";

export default function VerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";

  const [resendState, setResendState] = useState<ResendState>("idle");
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) return;
    setResendState("sending");
    setResendError(null);

    // Mirror sign-up's redirect handling: on web the link keeps the default
    // Site URL redirect; on native it must deep-link back into the app.
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      ...(Platform.OS === "web"
        ? {}
        : { options: { emailRedirectTo: EMAIL_CONFIRM_REDIRECT_URL } }),
    });

    if (error) {
      setResendState("error");
      setResendError(error.message);
      return;
    }
    setResendState("sent");
  }

  return (
    <View style={styles.root}>
      <GradientBackground />
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.title}>
          Confirm your email
        </Text>
        <Text variant="bodyMedium" style={styles.body}>
          {email
            ? `We sent a verification link to ${email}. Open it to finish setting up your account.`
            : "We sent a verification link to your email. Open it to finish setting up your account."}
        </Text>
        <Text variant="bodyMedium" style={styles.body}>
          If it&apos;s not in your inbox, check your spam or junk folder.
        </Text>

        {resendState === "sent" ? (
          <Text variant="bodyMedium" style={styles.notice}>
            Sent again — give it a minute to arrive.
          </Text>
        ) : null}
        {resendState === "error" ? (
          <Text variant="bodyMedium" style={styles.error}>
            {resendError ?? "Couldn't resend the email. Try again shortly."}
          </Text>
        ) : null}

        <Button
          mode="outlined"
          onPress={handleResend}
          loading={resendState === "sending"}
          disabled={!email || resendState === "sending"}
          textColor={Colors.brand.darkTeal}
          style={styles.button}
        >
          Resend verification email
        </Button>

        <Button
          mode="contained"
          onPress={() => router.replace("/")}
          buttonColor={Colors.brand.buttonTeal}
          textColor={Colors.white}
          style={styles.button}
        >
          Go to sign in
        </Button>
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
  notice: {
    color: Colors.brand.darkTeal,
    textAlign: "center",
  },
  error: {
    color: Colors.brand.rose,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    alignSelf: "stretch",
  },
});
