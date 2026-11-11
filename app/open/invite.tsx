import { Platform, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { Redirect, useLocalSearchParams } from "expo-router";
import GradientBackground from "../../components/GradientBackground";
import { Colors } from "../../lib/colors";

// The web page behind https://begifted.vercel.app/open/invite?code=… links.
// With the app installed, iOS opens the app instead and app/+native-intent.tsx
// keeps the code. A friend without the app installs it from TestFlight, which
// drops the code, so this page asks them to come back and open the app from
// here — that hand-off is what credits the invite.
const TESTFLIGHT_URL = "https://testflight.apple.com/join/2DRWAZgn";

function go(url: string) {
  // Same-tab navigation keeps the browser from opening a blank tab around
  // the scheme prompt.
  (
    globalThis as { location?: { assign: (url: string) => void } }
  ).location?.assign(url);
}

export default function OpenInvite() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  if (Platform.OS !== "web") return <Redirect href="/" />;

  // The empty host keeps "/open/invite" as the path, so the link passes
  // through app/+native-intent.tsx like the universal link.
  const nativeLink = code
    ? `begifted:///open/invite?code=${encodeURIComponent(code)}`
    : "begifted:///";

  return (
    <View style={styles.root}>
      <GradientBackground />
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.text}>
          A friend invited you to BeGifted
        </Text>
        <Text variant="bodyMedium" style={styles.text}>
          BeGifted helps you remember the people you give to and find gifts that
          suit them. It runs on iPhone, in a beta on TestFlight.
        </Text>
        <Text variant="bodyMedium" style={styles.text}>
          Install it, then come back to this page and tap Open BeGifted so your
          friend knows you joined.
        </Text>
        <Button
          mode="contained"
          onPress={() => go(TESTFLIGHT_URL)}
          buttonColor={Colors.brand.buttonTeal}
          textColor={Colors.white}
          style={styles.button}
        >
          Join the beta on TestFlight
        </Button>
        <Button
          mode="outlined"
          onPress={() => go(nativeLink)}
          textColor={Colors.brand.darkTeal}
        >
          Open BeGifted
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
