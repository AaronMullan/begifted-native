import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../lib/colors";

export default function OnboardingWelcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
      <View style={styles.content}>
        <Text variant="displaySmall" style={styles.headline}>
          Welcome to BeGifted
        </Text>
        <Text variant="bodyLarge" style={styles.body}>
          We&apos;ll help you find thoughtful gifts for the people you care about.
          Let&apos;s get to know you a little, then add your first person.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Button
          mode="contained"
          onPress={() => router.push("/onboarding/identity")}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Get started
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
    marginBottom: 16,
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
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
  },
});
