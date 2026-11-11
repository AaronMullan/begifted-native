import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { Redirect, useLocalSearchParams } from "expo-router";
import GradientBackground from "../../components/GradientBackground";
import { Colors } from "../../lib/colors";
import { claimInvite } from "../../lib/api/invites";

// The web page behind https://begifted.vercel.app/open/invite?code=… links.
// With the app installed, iOS opens the app instead and app/+native-intent.tsx
// keeps the code. A friend without the app installs it from TestFlight, which
// drops the code, so this page asks for the email they'll sign up with; an
// account with that email created afterwards is credited to the invite.
const TESTFLIGHT_URL = "https://testflight.apple.com/join/2DRWAZgn";

function go(url: string) {
  // Same-tab navigation keeps the browser from opening a blank tab around
  // the scheme prompt.
  (
    globalThis as { location?: { assign: (url: string) => void } }
  ).location?.assign(url);
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function OpenInvite() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [email, setEmail] = useState("");
  // Judged on blur, so a half-typed address isn't flagged mid-keystroke.
  const [blurred, setBlurred] = useState(false);

  const trimmed = email.trim();
  const emailMalformed = trimmed.length > 0 && !EMAIL_PATTERN.test(trimmed);
  const emailInvalid = blurred && emailMalformed;

  // Navigates inside the tap itself: iOS hands testflight.apple.com to the
  // TestFlight app only for a navigation that comes straight from a gesture,
  // so the claim is sent without waiting for it.
  const handleJoin = () => {
    if (emailMalformed) {
      setBlurred(true);
      return;
    }
    if (code && trimmed) claimInvite(code, trimmed);
    go(TESTFLIGHT_URL);
  };

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
        <View style={styles.field}>
          <TextInput
            mode="outlined"
            label="Your email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setBlurred(false);
            }}
            onBlur={() => {
              setBlurred(true);
              // Tapping Join blurs the field first, so the claim is already
              // in flight before the tap navigates away. Repeats are no-ops.
              if (code && trimmed && !emailMalformed) {
                claimInvite(code, trimmed);
              }
            }}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            outlineColor={Colors.brand.mediumTeal}
            activeOutlineColor={Colors.brand.darkTeal}
            textColor={Colors.brand.darkTeal}
            onSubmitEditing={handleJoin}
          />
          <HelperText type={emailInvalid ? "error" : "info"} visible>
            {emailInvalid
              ? "That doesn't look like an email address."
              : "Use the email you'll sign up with, so your friend knows you joined."}
          </HelperText>
        </View>
        <Button
          mode="contained"
          onPress={handleJoin}
          disabled={emailInvalid}
          buttonColor={Colors.brand.buttonTeal}
          textColor={Colors.white}
        >
          Join the beta on TestFlight
        </Button>
        <Button
          mode="text"
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
  field: {
    alignSelf: "stretch",
    maxWidth: 400,
    width: "100%",
    marginHorizontal: "auto",
  },
});
