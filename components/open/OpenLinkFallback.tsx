import { Platform, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { Redirect } from "expo-router";
import GradientBackground from "../GradientBackground";
import { Colors } from "../../lib/colors";

// The web page behind each https://begifted.vercel.app/open/* universal link.
// With the app installed, iOS opens the app instead and
// app/+native-intent.tsx routes it, so this renders only where the link
// didn't hand off: the app isn't installed, or the link was opened in a
// browser that doesn't follow universal links.
const TESTFLIGHT_URL = "https://testflight.apple.com/join/2DRWAZgn";

type BrowserLocation = {
  pathname: string;
  search: string;
  assign: (url: string) => void;
};

function browserLocation(): BrowserLocation | undefined {
  return (globalThis as { location?: BrowserLocation }).location;
}

// The empty host keeps "/open/..." as the path, so the scheme link passes
// through app/+native-intent.tsx and the auth gate like the universal link,
// carrying the same query (recipient_id, occasion_id).
function nativeDeepLink(): string {
  const location = browserLocation();
  if (!location) return "begifted:///open/home";
  return `begifted://${location.pathname}${location.search}`;
}

function go(url: string) {
  // Same-tab navigation keeps the browser from opening a blank tab around
  // the scheme prompt.
  browserLocation()?.assign(url);
}

type Props = {
  title: string;
};

const OpenLinkFallback: React.FC<Props> = ({ title }) => {
  if (Platform.OS !== "web") return <Redirect href="/" />;

  return (
    <View style={styles.root}>
      <GradientBackground />
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.text}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={styles.text}>
          BeGifted runs on iPhone. If it&apos;s installed, open it here. If not,
          join the beta on TestFlight first.
        </Text>
        <Button
          mode="contained"
          onPress={() => go(nativeDeepLink())}
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
};

export default OpenLinkFallback;

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
