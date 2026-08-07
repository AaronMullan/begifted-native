import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import GradientBackground from "../../components/GradientBackground";
import { PrimaryCta } from "../../components/PrimaryCta";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";

// Landing spot for the password-reset flow. resetPasswordForEmail sends a link
// whose verify redirect carries a PKCE ?code= — it lands here on the hosted
// web app first (email-client browsers won't follow a server redirect into a
// custom scheme; see app/auth/callback.tsx for the same handoff), and the
// user-tapped begifted:// link below re-enters this route in the native app,
// where the code is exchanged for a session and a new password can be set.
const NATIVE_DEEP_LINK = "begifted://auth/reset-password";

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error_description?: string;
  }>();
  // Keyed on the incoming code so re-renders can't double-spend the one-time
  // code, while a fresh link tapped after a failed one is still processed.
  const handledCode = useRef<string | null>(null);
  const [failedCode, setFailedCode] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const isWeb = Platform.OS === "web";
  const code = typeof params.code === "string" ? params.code : null;
  const errorDescription =
    typeof params.error_description === "string"
      ? params.error_description
      : null;

  useEffect(() => {
    // On web the code can't be exchanged: the PKCE verifier lives in the
    // native app's storage, not this browser. The tap-through below carries
    // the code into the app instead.
    if (isWeb || !code || handledCode.current === code) return;
    handledCode.current = code;

    async function establishSession(authCode: string) {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);
        if (error) throw error;
        setSessionReady(true);
      } catch {
        setFailedCode(authCode);
      }
    }

    void establishSession(code);
  }, [isWeb, code]);

  async function handleSave() {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Passwords don't match.");
      return;
    }

    setFormError("");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSaving(false);

    if (error) {
      setFormError("Couldn't update your password. Please try again.");
      return;
    }
    // The recovery exchange already signed the user in; app/index.tsx routes
    // the session to the dashboard (or onboarding).
    router.replace("/");
  }

  function openApp(authCode: string) {
    const target = `${NATIVE_DEEP_LINK}?code=${encodeURIComponent(authCode)}`;
    // Same-tab navigation keeps the browser from opening a blank tab around
    // the scheme prompt.
    (
      globalThis as { location?: { assign: (url: string) => void } }
    ).location?.assign(target);
  }

  if (isWeb && code) {
    return (
      <Frame>
        <Text variant="titleMedium" style={styles.title}>
          Reset your password
        </Text>
        <Text variant="bodyMedium" style={styles.body}>
          If you requested this on your phone, continue below to choose a new
          password in the app. On another device, request a new link from the
          app&apos;s sign-in screen.
        </Text>
        <Button
          mode="contained"
          onPress={() => openApp(code)}
          buttonColor={Colors.brand.buttonTeal}
          textColor={Colors.white}
          style={styles.button}
        >
          Open the BeGifted app
        </Button>
      </Frame>
    );
  }

  if (sessionReady) {
    return (
      <Frame>
        <Text variant="titleMedium" style={styles.title}>
          Choose a new password
        </Text>
        <View style={styles.field}>
          <TextInput
            mode="outlined"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            outlineColor={Colors.brand.mediumTeal}
            activeOutlineColor={Colors.brand.darkTeal}
            outlineStyle={styles.inputOutline}
            style={styles.input}
          />
          <Text style={[Typography.fieldLabel, styles.fieldLabel]}>
            New password (min {MIN_PASSWORD_LENGTH} characters)
          </Text>
        </View>
        <View style={styles.field}>
          <TextInput
            mode="outlined"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            outlineColor={Colors.brand.mediumTeal}
            activeOutlineColor={Colors.brand.darkTeal}
            outlineStyle={styles.inputOutline}
            style={styles.input}
          />
          <Text style={[Typography.fieldLabel, styles.fieldLabel]}>
            Confirm new password
          </Text>
        </View>
        {formError ? (
          <Text style={[Typography.caption, styles.errorText]}>
            {formError}
          </Text>
        ) : null}
        <PrimaryCta
          label="Save new password"
          state={saving ? "loading" : "idle"}
          onPress={handleSave}
          style={styles.cta}
        />
      </Frame>
    );
  }

  const failed = (code && failedCode === code) || !code;
  if (failed) {
    return (
      <Frame>
        <Text variant="titleMedium" style={styles.title}>
          We couldn&apos;t open that reset link
        </Text>
        <Text variant="bodyMedium" style={styles.body}>
          {errorDescription ??
            "This reset link is invalid or has expired. Request a new one from the sign-in screen."}
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
      </Frame>
    );
  }

  return (
    <Frame>
      <ActivityIndicator size="large" color={Colors.brand.darkTeal} />
      <Text variant="bodyMedium" style={styles.body}>
        Opening your reset link…
      </Text>
    </Frame>
  );
}

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.root}>
    <GradientBackground />
    <View style={styles.content}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
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
    alignSelf: "center",
  },
  field: {
    alignSelf: "stretch",
  },
  input: {
    marginBottom: 4,
    backgroundColor: Colors.brand.beigeLight,
  },
  inputOutline: {
    borderRadius: Radii.sm,
  },
  fieldLabel: {
    color: Colors.brand.mediumTeal,
    marginLeft: 4,
  },
  errorText: {
    color: Colors.brand.rose,
    marginLeft: 4,
  },
  cta: {
    marginTop: 8,
  },
});
