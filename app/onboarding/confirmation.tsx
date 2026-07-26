import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ProfileReadyInterstitial } from "../../components/ProfileReadyInterstitial";

/**
 * End of the tell-us-about-yourself intake: the "Your profile is ready"
 * transition (Figma 5110:4046). Auto-advances into adding the first person.
 */
export default function OnboardingConfirmation() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ProfileReadyInterstitial
        title="Your profile is ready"
        subtitle="Time to add people. Let’s get started!"
        onDone={() => router.replace("/onboarding/recipient")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
