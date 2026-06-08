import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import IntroSwiper from "../../components/intro/IntroSwiper";

export default function IntroScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <IntroSwiper onSignUp={() => router.push("/intro/signup")} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
