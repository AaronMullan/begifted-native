import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { supabase, EMAIL_CONFIRM_REDIRECT_URL } from "../lib/supabase";
import { fetchAppConfig } from "../lib/api";
import LegalAcceptanceCheckbox from "./LegalAcceptanceCheckbox";
import { PrimaryCta } from "./PrimaryCta";
import {
  markPendingLegalAcceptance,
  recordLegalAcceptance,
} from "../lib/legal-acceptance";
import { Session } from "@supabase/supabase-js";
import { Colors } from "../lib/colors";
import { Typography, Radii } from "../lib/typography";
import { Spacing } from "../lib/spacing";
import { KEYBOARD_CTA_GAP } from "@/lib/constants";

type FormData = {
  email: string;
  password: string;
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  async function handleSignIn(data: FormData) {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      reset();
    }

    setLoading(false);
  }

  async function handleSignUp(data: FormData) {
    setLoading(true);
    setMessage("");

    try {
      const config = await fetchAppConfig();
      if (!config.signups_enabled) {
        setMessage(
          "New signups are temporarily disabled. Please check back soon."
        );
        setLoading(false);
        return;
      }
    } catch {
      // If config fetch fails, allow signup to proceed
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      // On web the verification link keeps the default Site URL redirect; on
      // native it must deep-link back into the app (see app/auth/callback.tsx).
      ...(Platform.OS === "web"
        ? {}
        : { options: { emailRedirectTo: EMAIL_CONFIRM_REDIRECT_URL } }),
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else if (signUpData.user?.identities?.length === 0) {
      setMessage(
        "Error: An account with this email already exists. Try signing in instead."
      );
    } else if (signUpData.session) {
      // Fire-and-forget: recording must not delay the signed-in transition,
      // and failures are Sentry-reported inside the helper.
      void recordLegalAcceptance("signup_checkbox");
      reset();
    } else {
      // No session yet, so the acceptance can't be recorded until the user
      // verifies and signs in; flushed by app/index.tsx on first load.
      await markPendingLegalAcceptance();
      setMessage(
        Platform.OS === "web"
          ? "Check your inbox to verify your email before signing in."
          : "Check your inbox — the verification link will bring you back to the app."
      );
    }

    setLoading(false);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(`Error: ${error.message}`);
  }

  if (session && session.user) {
    return (
      <View style={styles.container}>
        <Text style={[Typography.h2, styles.welcomeText]}>
          Welcome, {session.user.email}!
        </Text>
        <PrimaryCta
          label="Sign Out"
          onPress={signOut}
          style={styles.signOutButton}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={KEYBOARD_CTA_GAP}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.container}>
          <Text style={[Typography.h1, styles.title]}>
            {isSignUp ? "Create an account" : "Welcome back"}
          </Text>
          <Text style={[Typography.copyblock, styles.subtitle]}>
            {isSignUp
              ? "Enter your email and a password to get started"
              : "Sign in with your email and password"}
          </Text>

          {/* Email Field */}
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Controller
              control={control}
              name="email"
              rules={{
                required: "Email is required",
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: "Please enter a valid email",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  error={!!errors.email}
                  outlineColor={Colors.brand.mediumTeal}
                  activeOutlineColor={Colors.brand.darkTeal}
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
                />
              )}
            />
            <Text style={[Typography.fieldLabel, styles.fieldLabel]}>
              Email
            </Text>
            {errors.email && (
              <Text style={[Typography.caption, styles.errorText]}>
                {errors.email.message}
              </Text>
            )}
          </View>

          {/* Password Field */}
          <View style={styles.verticallySpaced}>
            <Controller
              control={control}
              name="password"
              rules={{
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoCapitalize="none"
                  error={!!errors.password}
                  outlineColor={Colors.brand.mediumTeal}
                  activeOutlineColor={Colors.brand.darkTeal}
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
                />
              )}
            />
            <Text style={[Typography.fieldLabel, styles.fieldLabel]}>
              Password (min 6 characters)
            </Text>
            {errors.password && (
              <Text style={[Typography.caption, styles.errorText]}>
                {errors.password.message}
              </Text>
            )}
          </View>

          {isSignUp && (
            <View style={styles.verticallySpaced}>
              <LegalAcceptanceCheckbox
                accepted={acceptedLegal}
                onToggle={setAcceptedLegal}
                disabled={loading}
              />
            </View>
          )}

          {/* Submit Button */}
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <PrimaryCta
              label={isSignUp ? "Create Account" : "Sign In"}
              state={loading ? "loading" : "idle"}
              disabled={isSignUp && !acceptedLegal}
              onPress={handleSubmit(isSignUp ? handleSignUp : handleSignIn)}
            />
            <Button
              mode="text"
              textColor={Colors.brand.darkTeal}
              disabled={loading}
              onPress={() => {
                setIsSignUp((prev) => !prev);
                setMessage("");
              }}
              style={styles.button}
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Create one"}
            </Button>
          </View>

          {/* Success/Error Messages */}
          {message && (
            <View
              style={[
                styles.messageContainer,
                message.includes("Error") && styles.errorContainer,
              ]}
            >
              <Text
                style={[
                  Typography.copyblock,
                  styles.messageText,
                  message.includes("Error") && styles.errorMessageText,
                ]}
              >
                {message}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    marginTop: 40,
    padding: 12,
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    color: Colors.brand.darkTeal,
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.brand.darkTeal,
    marginBottom: 20,
  },
  verticallySpaced: {
    paddingVertical: Spacing.fieldGapAuth / 2,
    alignSelf: "stretch",
  },
  mt20: {
    marginTop: 20,
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
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    marginTop: 8,
  },
  signOutButton: {
    marginTop: 20,
  },
  welcomeText: {
    color: Colors.brand.darkTeal,
    marginBottom: 20,
    textAlign: "center",
  },
  hint: {
    marginTop: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  messageContainer: {
    marginTop: 20,
    padding: Spacing.fieldGapAuth,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
  },
  messageText: {
    color: Colors.brand.darkTeal,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: Colors.white,
  },
  errorMessageText: {
    color: Colors.brand.rose,
  },
});
