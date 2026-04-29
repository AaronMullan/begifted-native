import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Platform,
  Pressable,
} from "react-native";
import { Text, Button, TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../lib/colors";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/use-auth";

export default function OnboardingIdentity() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    if (!user || !description.trim()) {
      router.push("/onboarding/confirmation");
      return;
    }

    try {
      setSaving(true);
      await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            user_description: description.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      // Generate initial giver profile in the background (partial — no gifting style yet)
      supabase.functions
        .invoke("synthesize-giver-profile", { body: { userId: user.id } })
        .catch(() => {});

      router.push("/onboarding/confirmation");
    } catch (error) {
      console.error("Error saving user description:", error);
      router.push("/onboarding/confirmation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.content}>
            <Text variant="headlineMedium" style={styles.headline}>
              Tell us about yourself
            </Text>
            <Text variant="bodyLarge" style={styles.body}>
              Tell me a little about yourself — it helps BeGifted get a feel
              for your taste, your world, and the people you care about. A lot
              or a little is fine. What are you like?
            </Text>

            <TextInput
              mode="outlined"
              placeholder="e.g. I'm a creative person who loves cooking, hiking, and finding unique handmade gifts for friends and family..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              contentStyle={styles.inputContent}
            />
          </View>

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleContinue}
              loading={saving}
              disabled={saving}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Continue
            </Button>
            <Button
              mode="text"
              onPress={() => router.push("/onboarding/confirmation")}
              disabled={saving}
              labelStyle={styles.skipLabel}
              style={styles.skipButton}
            >
              Skip for now
            </Button>
          </View>
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  headline: {
    color: Colors.darks.black,
    marginBottom: 12,
    fontFamily: "Fraunces_400Regular",
  },
  body: {
    color: Colors.darks.black,
    opacity: 0.8,
    lineHeight: 26,
    marginBottom: 24,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.6)",
    minHeight: 120,
  },
  inputOutline: {
    borderRadius: 18,
  },
  inputContent: {
    paddingTop: 16,
  },
  footer: {
    paddingVertical: 24,
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
    gap: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
  },
  skipButton: {
    marginTop: 4,
  },
  skipLabel: {
    color: Colors.darks.black,
    opacity: 0.6,
  },
});
