import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { FontFamily, Typography } from "../../lib/typography";
import { upsertUserPreferences } from "../../lib/api";
import { useAuth } from "../../hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";
import { useBetaCheckIn } from "../../components/beta/BetaCheckInProvider";
import AddRecipientLegalNotice from "../../components/recipients/AddRecipientLegalNotice";

export default function OnboardingRecipient() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { triggerCheckIn } = useBetaCheckIn();
  const [completing, setCompleting] = useState(false);

  async function completeOnboarding(
    destination: "/contacts/add" | "/contacts"
  ) {
    if (!user) return;

    try {
      setCompleting(true);
      await upsertUserPreferences(user.id, { onboarding_completed: true });
      queryClient.invalidateQueries({
        queryKey: queryKeys.userPreferences(user.id),
      });
      // Onboarding just finished -> fire the first beta check-in. The provider
      // lives above the router, so the sheet presents over the destination and
      // survives this navigation.
      triggerCheckIn("onboarding");
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
          Who do you want to find gifts for? It can be anyone you care about —
          including yourself. Describe them in your own words or import from
          your contacts.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <AddRecipientLegalNotice />
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
    fontFamily: FontFamily.fraunces.regular,
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
    ...Typography.largeCta,
  },
  buttonLabelOutlined: {
    ...Typography.largeCta,
    color: Colors.darks.black,
  },
});
