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
import {
  markPendingLegalAcceptance,
  recordLegalAcceptance,
} from "../lib/legal-acceptance";
import { Session } from "@supabase/supabase-js";
import { Colors } from "../lib/colors";
import { Typography, Radii } from "../lib/typography";

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
        <Text variant="titleLarge" style={styles.welcomeText}>
          Welcome, {session.user.email}!
        </Text>
        <Button
          mode="contained"
          buttonColor="#000000"
          onPress={signOut}
          style={styles.signOutButton}
        >
          Sign Out
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.container}>
          <Text variant="headlineSmall" style={styles.title}>
            {isSignUp ? "Create Account" : "Sign In"}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
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
              <Text variant="bodySmall" style={styles.errorText}>
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
              <Text variant="bodySmall" style={styles.errorText}>
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
            <Button
              mode="contained"
              disabled={loading || (isSignUp && !acceptedLegal)}
              loading={loading}
              onPress={handleSubmit(isSignUp ? handleSignUp : handleSignIn)}
              style={styles.button}
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
            <Button
              mode="text"
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
                variant="bodyMedium"
                style={[
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
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
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
    color: "#FF3B30",
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
    padding: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  messageText: {
    color: "#2E7D32",
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#FFEBEE",
    borderColor: "#FF3B30",
  },
  errorMessageText: {
    color: "#FF3B30",
  },
});
