import { useState, useEffect } from "react";
import { StyleSheet, View, AppState } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

type FormData = {
  email: string;
  password: string;
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");

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

  async function handleAuth(data: FormData) {
    setLoading(true);
    setMessage("");

    // Try to sign in first
    let { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    // If user doesn't exist, create account
    if (error?.message.includes("Invalid login credentials")) {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });

      if (signUpError) {
        setMessage(`Error: ${signUpError.message}`);
      } else if (signUpData.session) {
        setMessage("✅ Account created! You're signed in.");
        reset();
      } else {
        setMessage(
          "Account created but requires email verification. Check your inbox."
        );
      }
    } else if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("✅ Signed in successfully!");
      reset();
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
          buttonColor="#FF3B30"
          onPress={signOut}
          style={styles.signOutButton}
        >
          Sign Out
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Sign In
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Sign in with your email and password
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
              label="Email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="email@address.com"
              autoCapitalize="none"
              keyboardType="email-address"
              error={!!errors.email}
              style={styles.input}
            />
          )}
        />
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
              label="Password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              placeholder="Password (min 6 characters)"
              autoCapitalize="none"
              error={!!errors.password}
              style={styles.input}
            />
          )}
        />
        {errors.password && (
          <Text variant="bodySmall" style={styles.errorText}>
            {errors.password.message}
          </Text>
        )}
      </View>

      {/* Sign In / Sign Up Button */}
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          mode="contained"
          disabled={loading}
          loading={loading}
          onPress={handleSubmit(handleAuth)}
          style={styles.button}
        >
          Sign In / Sign Up
        </Button>
        <Text variant="bodySmall" style={styles.hint}>
          Don't have an account? Just enter your email and a password to create
          one.
        </Text>
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
  );
}

const styles = StyleSheet.create({
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
