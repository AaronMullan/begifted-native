import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandMark from "../BrandMark";
import BrandWordmark from "../BrandWordmark";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";
import { supabase } from "../../lib/supabase";
import { fetchAppConfig } from "../../lib/api";

type IntroSignUpProps = {
  onSignedUp: () => Promise<void> | void;
  onGoToSignIn: () => Promise<void> | void;
};

type SignUpResult =
  | { error: string }
  | { needsVerification: true }
  | { ok: true };

async function performSignUp(
  name: string,
  email: string,
  password: string
): Promise<SignUpResult> {
  const config = await fetchAppConfig().catch(() => null);
  if (config && !config.signups_enabled) {
    return {
      error: "New signups are temporarily disabled. Please check back soon.",
    };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };
  if (data.user?.identities?.length === 0) {
    return {
      error:
        "An account with this email already exists. Try signing in instead.",
    };
  }

  if (data.user) {
    await supabase
      .from("profiles")
      .upsert({ id: data.user.id, full_name: name }, { onConflict: "id" });
  }

  if (!data.session) return { needsVerification: true };
  return { ok: true };
}

export default function IntroSignUp({
  onSignedUp,
  onGoToSignIn,
}: IntroSignUpProps) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    !submitting;

  async function handleSubmit() {
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      const result = await performSignUp(name.trim(), email.trim(), password);

      if ("error" in result) {
        setError(result.error);
        return;
      }
      if ("needsVerification" in result) {
        setInfo("Check your inbox to verify your email, then sign in.");
        return;
      }

      await onSignedUp();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BrandMark size={28} />
        <BrandWordmark height={13} color={Colors.brand.darkTeal} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={[Typography.h1, styles.headline]}>
          {"Create\nan account."}
        </Text>

        <View style={styles.field}>
          <TextInput
            mode="outlined"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            style={styles.input}
            outlineColor={Colors.brand.mediumTeal}
            activeOutlineColor={Colors.brand.darkTeal}
            outlineStyle={styles.inputOutline}
            disabled={submitting}
          />
          <Text style={[Typography.eyebrow, styles.fieldLabel]}>NAME</Text>
        </View>

        <View style={styles.field}>
          <TextInput
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            style={styles.input}
            outlineColor={Colors.brand.mediumTeal}
            activeOutlineColor={Colors.brand.darkTeal}
            outlineStyle={styles.inputOutline}
            disabled={submitting}
          />
          <Text style={[Typography.eyebrow, styles.fieldLabel]}>EMAIL</Text>
        </View>

        <View style={styles.field}>
          <TextInput
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            style={styles.input}
            outlineColor={Colors.brand.mediumTeal}
            activeOutlineColor={Colors.brand.darkTeal}
            outlineStyle={styles.inputOutline}
            disabled={submitting}
          />
          <Text style={[Typography.eyebrow, styles.fieldLabel]}>
            PASSWORD (MIN 6 CHARACTERS)
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit}
          buttonColor={Colors.brand.buttonTeal}
          textColor={Colors.white}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          SIGN ME UP!
        </Button>

        <Button
          mode="text"
          onPress={onGoToSignIn}
          disabled={submitting}
          textColor={Colors.brand.darkTeal}
          labelStyle={styles.signInLabel}
          style={styles.signInButton}
        >
          Already have an account? Sign in
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 24,
    gap: 16,
  },
  headline: {
    color: Colors.brand.darkTeal,
    marginBottom: 16,
  },
  field: {
    gap: 4,
  },
  input: {
    backgroundColor: Colors.white,
  },
  inputOutline: {
    borderRadius: Radii.sm,
  },
  fieldLabel: {
    color: Colors.brand.mediumTeal,
    letterSpacing: 1,
    marginLeft: 4,
  },
  error: {
    color: Colors.pinks.medium,
    marginTop: 4,
  },
  info: {
    color: Colors.brand.darkTeal,
    marginTop: 4,
  },
  button: {
    borderRadius: Radii.pill,
    marginTop: 16,
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    ...Typography.largeCta,
    fontSize: 13,
    // largeCta sets lineHeight 12, which clips a 13px glyph — give it room.
    lineHeight: 18,
    letterSpacing: 1.5,
    color: Colors.white,
  },
  signInButton: {
    alignSelf: "center",
    marginTop: 4,
  },
  signInLabel: {
    opacity: 0.8,
  },
});
