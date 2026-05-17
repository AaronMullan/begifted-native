import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
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

type SignUpSlideProps = {
  onSignUpSuccess: () => Promise<void> | void;
  onGoToSignIn: () => Promise<void> | void;
};

type SignUpInput = {
  name: string;
  email: string;
  password: string;
  onEmailVerificationRequired: () => void;
};

async function performSignUp({
  name,
  email,
  password,
  onEmailVerificationRequired,
}: SignUpInput): Promise<string | null> {
  const config = await fetchAppConfig().catch(() => null);
  if (config && !config.signups_enabled) {
    return "New signups are temporarily disabled. Please check back soon.";
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return error.message;
  if (data.user?.identities?.length === 0) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (data.user) {
    await supabase
      .from("profiles")
      .upsert({ id: data.user.id, full_name: name }, { onConflict: "id" });
  }

  if (!data.session) {
    onEmailVerificationRequired();
  }

  return null;
}

export default function SignUpSlide({
  onSignUpSuccess,
  onGoToSignIn,
}: SignUpSlideProps) {
  const { width, height } = useWindowDimensions();
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
      const errorMessage = await performSignUp({
        name: name.trim(),
        email: email.trim(),
        password,
        onEmailVerificationRequired: () =>
          setInfo("Check your inbox to verify your email before signing in."),
      });

      if (errorMessage) {
        setError(errorMessage);
        return;
      }

      await onSignUpSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.slide, { width, height }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BrandMark size={28} />
        <BrandWordmark height={12} color={Colors.darks.black} />
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
          Create{"\n"}an account.
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
          buttonColor={Colors.brand.darkTeal}
          textColor={Colors.white}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          style={styles.button}
        >
          SIGN ME UP!
        </Button>

        <Button
          mode="text"
          onPress={onGoToSignIn}
          disabled={submitting}
          textColor={Colors.darks.black}
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
  slide: {
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
    height: 44,
  },
  inputOutline: {
    borderRadius: Radii.sm,
    borderColor: Colors.brand.darkTeal,
  },
  fieldLabel: {
    color: Colors.brand.darkTeal,
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
    alignSelf: "center",
    minWidth: 200,
  },
  buttonContent: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  buttonLabel: {
    ...Typography.smallCta,
    color: Colors.white,
    letterSpacing: 1.5,
  },
  signInButton: {
    alignSelf: "center",
    marginTop: 4,
  },
  signInLabel: {
    opacity: 0.7,
  },
});
