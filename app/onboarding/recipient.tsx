import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";

export default function OnboardingRecipient() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [completing, setCompleting] = useState(false);

  async function completeOnboarding(destination: "/contacts/add" | "/contacts") {
    if (!user) return;

    try {
      setCompleting(true);
      await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      queryClient.invalidateQueries({
        queryKey: queryKeys.userPreferences(user.id),
      });
      router.replace(destination);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      router.replace(destination);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.headline}>
          Add your first person
        </Text>
        <Text variant="bodyLarge" style={styles.body}>
          Who do you want to find gifts for? You can describe them in your own
          words or import from your contacts.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Button
          mode="contained"
          onPress={() => completeOnboarding("/contacts/add")}
          loading={completing}
          disabled={completing}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          icon={({ size, color }) => (
            <MaterialIcons name="person-add" size={size} color={color} />
          )}
        >
          Add a person
        </Button>
        <Button
          mode="outlined"
          onPress={() => completeOnboarding("/contacts")}
          disabled={completing}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabelOutlined}
          icon={({ size, color }) => (
            <MaterialIcons name="contacts" size={size} color={color} />
          )}
        >
          Import from contacts
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
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
  },
  footer: {
    paddingVertical: 24,
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
    gap: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
  },
  buttonLabelOutlined: {
    fontSize: 16,
    color: Colors.darks.black,
  },
});
