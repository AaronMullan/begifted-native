import { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { Redirect, useLocalSearchParams } from "expo-router";
import GradientBackground from "../../components/GradientBackground";
import { Colors } from "../../lib/colors";
import { Spacing } from "../../lib/spacing";
import { Typography } from "../../lib/typography";
import { claimInvite } from "../../lib/api/invites";

// The web page behind https://begifted.vercel.app/open/invite?code=… links.
// With the app installed, iOS opens the app instead and app/+native-intent.tsx
// keeps the code. A friend without the app installs it from TestFlight, which
// drops the code, so this page asks for the email they'll sign up with; an
// account with that email created afterwards is credited to the invite.
// Header and BottomNav hide themselves on this path; its link-preview tags
// are rendered by components/open/InviteLinkPreview.tsx.
const TESTFLIGHT_URL = "https://testflight.apple.com/join/2DRWAZgn";

const BODY = [
  "The holidays. Birthdays. Anniversaries. And all the moments worth celebrating.",
  "BeGifted gets to know the people in your life, your relationships, and how you like to give.",
  "Once you’ve added someone, BeGifted remembers their important occasions and gets to work finding thoughtful gifts as those moments approach. Three curated ideas, chosen for the person, the occasion, and your relationship. And when they’re ready, BeGifted lets you know.",
  "It remembers what you share and learns from your feedback, making future recommendations more personal.",
  "Less searching. More thoughtful gifting.",
];

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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <Text style={styles.eyebrow}>A friend invited you to BeGifted.</Text>
          <Text style={styles.headline}>
            Your personal gifting concierge. For everyone on your list.
          </Text>
          <View style={styles.body}>
            {BODY.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
          <Text style={styles.supporting}>
            BeGifted is currently in beta for iPhone.
          </Text>
          <View>
            <TextInput
              mode="outlined"
              label="Your email (optional)"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setBlurred(false);
              }}
              onBlur={() => {
                setBlurred(true);
                // Tapping the CTA blurs the field first, so the claim is
                // already in flight before the tap navigates away. Repeats
                // are no-ops.
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
            <HelperText
              type={emailInvalid ? "error" : "info"}
              visible
              style={emailInvalid ? styles.helperError : styles.helper}
            >
              {emailInvalid
                ? "That doesn't look like an email address."
                : "Enter the email address you plan to use when signing up for BeGifted. This helps us connect your account to your friend’s invitation. Your friend won’t see it."}
            </HelperText>
          </View>
          <Button
            mode="contained"
            onPress={handleJoin}
            disabled={emailInvalid}
            buttonColor={Colors.brand.buttonTeal}
            textColor={Colors.white}
            labelStyle={Typography.largeCta}
            contentStyle={styles.ctaContent}
          >
            Continue to TestFlight
          </Button>
          <Button
            mode="text"
            onPress={() => go(nativeLink)}
            textColor={Colors.brand.darkTeal}
            labelStyle={Typography.smallCta}
          >
            Already have BeGifted? Open the app.
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.screenGutter,
    paddingVertical: Spacing.sectionGap,
  },
  column: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    gap: Spacing.moduleStackGap,
  },
  eyebrow: {
    ...Typography.fieldLabel,
    color: Colors.brand.mediumTeal,
  },
  headline: {
    ...Typography.h1,
    color: Colors.brand.darkTeal,
  },
  body: {
    gap: Spacing.cardGap,
  },
  paragraph: {
    ...Typography.copyblock,
    color: Colors.brand.darkTeal,
  },
  supporting: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
  },
  helper: {
    ...Typography.caption,
    color: Colors.brand.mediumTeal,
    paddingHorizontal: 0,
  },
  helperError: {
    ...Typography.caption,
    paddingHorizontal: 0,
  },
  ctaContent: {
    paddingVertical: Spacing.sectionHeadToContent,
  },
});
