import { Platform, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { Redirect } from "expo-router";
import GradientBackground from "../../components/GradientBackground";
import { Colors } from "../../lib/colors";

// The web page behind the https://begifted.vercel.app/open/add-person
// universal link. With the app installed, iOS opens the app instead and
// app/+native-intent.tsx routes it, so this renders only where the link
// didn't hand off: the app isn't installed, or the link was opened in a
// browser that doesn't follow universal links.
// The empty host keeps "/open/add-person" as the path, so the link passes
// through app/+native-intent.tsx and the auth gate like the universal link.
const NATIVE_DEEP_LINK = "begifted:///open/add-person";
const TESTFLIGHT_URL = "https://testflight.apple.com/join/2DRWAZgn";

function go(url: string) {
  // Same-tab navigation keeps the browser from opening a blank tab around
  // the scheme prompt.
  (
    globalThis as { location?: { assign: (url: string) => void } }
  ).location?.assign(url);
}

export default function OpenAddPerson() {
  if (Platform.OS !== "web") return <Redirect href="/" />;

  return (
    <View style={styles.root}>
      <GradientBackground />
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.text}>
          Add someone in the BeGifted app
        </Text>
        <Text variant="bodyMedium" style={styles.text}>
          BeGifted runs on iPhone. If it&apos;s installed, open it here. If not,
          join the beta on TestFlight first.
        </Text>
        <Button
          mode="contained"
          onPress={() => go(NATIVE_DEEP_LINK)}
          buttonColor={Colors.brand.buttonTeal}
          textColor={Colors.white}
          style={styles.button}
        >
          Open BeGifted
        </Button>
        <Button
          mode="outlined"
          onPress={() => go(TESTFLIGHT_URL)}
          textColor={Colors.brand.darkTeal}
        >
          Join the beta on TestFlight
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  text: {
    color: Colors.brand.darkTeal,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
  },
});
