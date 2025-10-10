import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  AppState,
  TextInput,
  TouchableOpacity,
  Text,
  Platform,
} from "react-native";
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

  async function sendMagicLink(data: FormData) {
    setLoading(true);
    setMessage("");

    // Get the current URL for web, use deep link for mobile
    const getRedirectUrl = () => {
      if (Platform.OS === "web") {
        // Use window.location.origin to get current URL (works for localhost and production)
        return typeof window !== "undefined"
          ? window.location.origin
          : "https://begifted.vercel.app";
      }
      return "begifted://";
    };

    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: getRedirectUrl(),
      },
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("✅ Check your email for the magic link!");
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
        <Text style={styles.welcomeText}>Welcome, {session.user.email}!</Text>
        <TouchableOpacity
          style={[styles.button, styles.signOutButton]}
          onPress={signOut}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in with a magic link</Text>
      <Text style={styles.subtitle}>
        No password needed. We'll send you a link to sign in.
      </Text>

      {/* Email Field */}
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Text style={styles.label}>Email</Text>
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
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              placeholder="email@address.com"
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, errors.email && styles.inputError]}
            />
          )}
        />
        {errors.email && (
          <Text style={styles.errorText}>{errors.email.message}</Text>
        )}
      </View>

      {/* Send Magic Link Button */}
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity
          style={styles.button}
          disabled={loading}
          onPress={handleSubmit(sendMagicLink)}
        >
          <Text style={styles.buttonText}>
            {loading ? "Sending..." : "Send Magic Link"}
          </Text>
        </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
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
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: "#FF3B30",
    borderWidth: 2,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  signOutButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
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
    fontSize: 14,
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
