import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import IntroSwiper from "../../components/intro/IntroSwiper";
import { markIntroSeen } from "../../lib/intro-storage";

export default function IntroScreen() {
  const router = useRouter();

  async function handleSignUpSuccess() {
    await markIntroSeen();
    // Auth state change is observed by app/index.tsx, which routes the new
    // session into the existing post-auth onboarding flow.
    router.replace("/");
  }

  async function handleGoToSignIn() {
    await markIntroSeen();
    router.replace("/");
  }

  return (
    <View style={styles.root}>
      <IntroSwiper
        onSignUpSuccess={handleSignUpSuccess}
        onGoToSignIn={handleGoToSignIn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
