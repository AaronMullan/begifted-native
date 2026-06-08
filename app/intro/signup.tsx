import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import IntroSignUp from "../../components/intro/IntroSignUp";
import { markIntroSeen } from "../../lib/intro-storage";

export default function IntroSignUpScreen() {
  const router = useRouter();

  // The intro gate is set on both paths so the slider never reappears once a
  // user has reached sign-up/sign-in. After redirecting to "/", app/index.tsx
  // routes a fresh session into the existing /onboarding/welcome flow, or shows
  // the <Auth /> sign-in form when there is no session yet.
  async function handleSignedUp() {
    await markIntroSeen();
    router.replace("/");
  }

  async function handleGoToSignIn() {
    await markIntroSeen();
    router.replace("/");
  }

  return (
    <View style={styles.root}>
      <IntroSignUp
        onSignedUp={handleSignedUp}
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
