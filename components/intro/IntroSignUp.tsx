import { useState } from "react";
import * as Sentry from "@sentry/react-native";
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
import { supabase, EMAIL_CONFIRM_REDIRECT_URL } from "../../lib/supabase";
import { fetchAppConfig } from "../../lib/api";
import LegalAcceptanceCheckbox from "../LegalAcceptanceCheckbox";
import {
  markPendingLegalAcceptance,
  recordLegalAcceptance,
} from "../../lib/legal-acceptance";
import { Spacing } from "@/lib/spacing";
import { KEYBOARD_CTA_GAP } from "@/lib/constants";

type IntroSignUpProps = {
  onSignedUp: () => Promise<void> | void;
  onGoToSignIn: () => Promise<void> | void;
  onNeedsVerification: (email: string) => Promise<void> | void;
};

type SignUpResult =
  { error: string } | { needsVerification: true } | { ok: true };

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The on_auth_user_created trigger copies full_name out of this metadata
      // as it inserts the profile row, which is the only path that works while
      // email confirmation is pending: there is no session yet, so a client
      // write would be RLS-filtered to zero rows and still report success.
      data: { full_name: name },
      // On web the verification link keeps the default Site URL redirect; on
      // native it must deep-link back into the app (see app/auth/callback.tsx).
      ...(Platform.OS === "web"
        ? {}
        : { emailRedirectTo: EMAIL_CONFIRM_REDIRECT_URL }),
    },
  });

  if (error) return { error: error.message };
  if (data.user?.identities?.length === 0) {
    return {
      error:
        "An account with this email already exists. Try signing in instead.",
    };
  }

  if (!data.session) return { needsVerification: true };
  if (data.user) await confirmNameSaved(data.user.id, name);
  return { ok: true };
}

/**
 * A profile write that changes nothing looks identical to one that worked, so
 * the name is verified by reading it back rather than by the absence of an
 * error. Requires the session signUp just returned; without one the read is
 * RLS-filtered too and proves nothing. Repair failures go to Sentry instead of
 * blocking the user, whose account already exists by this point.
 */
async function confirmNameSaved(userId: string, name: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data?.full_name === name) return;

    // .single() turns an RLS-filtered no-op into an error, which a bare
    // update would not surface.
    const { error: repairError } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", userId)
      .select("full_name")
      .single();
    if (repairError) throw repairError;
  } catch (err) {
    Sentry.captureException(
      err instanceof Error ? err : new Error(String(err)),
      { tags: { feature: "signup-name" } }
    );
  }
}

export default function IntroSignUp({
  onSignedUp,
  onGoToSignIn,
  onNeedsVerification,
}: IntroSignUpProps) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    acceptedLegal &&
    !submitting;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      const result = await performSignUp(name.trim(), trimmedEmail, password);

      if ("error" in result) {
        setError(result.error);
        return;
      }
      if ("needsVerification" in result) {
        // No session yet, so the acceptance can't be recorded until the user
        // verifies and signs in; flushed by app/index.tsx on first load.
        await markPendingLegalAcceptance();
        await onNeedsVerification(trimmedEmail);
        return;
      }

      // Fire-and-forget: recording must not delay navigation, and failures
      // are Sentry-reported inside the helper.
      void recordLegalAcceptance("signup_checkbox");
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
      keyboardVerticalOffset={KEYBOARD_CTA_GAP}
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
          <Text style={[Typography.fieldLabel, styles.fieldLabel]}>Name</Text>
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
          <Text style={[Typography.fieldLabel, styles.fieldLabel]}>Email</Text>
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
          <Text style={[Typography.fieldLabel, styles.fieldLabel]}>
            Password (min 6 characters)
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <LegalAcceptanceCheckbox
          accepted={acceptedLegal}
          onToggle={setAcceptedLegal}
          disabled={submitting}
        />

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
    backgroundColor: Colors.brand.beigeLight,
  },
  inputOutline: {
    borderRadius: Radii.sm,
  },
  fieldLabel: {
    color: Colors.brand.mediumTeal,
    marginLeft: 4,
  },
  error: {
    color: Colors.brand.rose,
    marginTop: 4,
  },
  button: {
    borderRadius: Radii.pill,
    marginTop: Spacing.fieldToCta,
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    ...Typography.largeCta,
    // eslint-disable-next-line no-restricted-syntax -- Figma intro frames set this CTA at 13; no token at that size
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
