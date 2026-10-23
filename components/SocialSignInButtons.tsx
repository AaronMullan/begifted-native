import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import * as AppleAuthentication from "expo-apple-authentication";
import GoogleLogo from "./GoogleLogo";
import LinkFallbackSnackbar from "./LinkFallbackSnackbar";
import { useOpenLinkWithFallback } from "../hooks/use-open-link-with-fallback";
import { TERMS_OF_SERVICE_URL, PRIVACY_POLICY_URL } from "../lib/legal";
import {
  availableSocialProviders,
  signInWithProvider,
} from "../lib/social-auth";
import type {
  SocialAcceptanceMethod,
  SocialProvider,
} from "../lib/social-auth";
import { Colors } from "../lib/colors";
import { Typography, Radii } from "../lib/typography";
import { Spacing } from "../lib/spacing";

type SocialSignInButtonsProps = {
  acceptanceMethod: SocialAcceptanceMethod;
  disabled: boolean;
  /** Resolves an error message to stop before the provider sheet opens. */
  beforeSignIn?: () => Promise<string | null>;
  onSignedIn: () => Promise<void> | void;
  onError: (message: string) => void;
};

const BUTTON_HEIGHT = 48;

const SocialSignInButtons: React.FC<SocialSignInButtonsProps> = ({
  acceptanceMethod,
  disabled,
  beforeSignIn,
  onSignedIn,
  onError,
}) => {
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const { open, failedUrl, copyFailedLink, dismiss } =
    useOpenLinkWithFallback();

  useEffect(() => {
    let mounted = true;
    void availableSocialProviders().then((p) => {
      if (mounted) setProviders(p);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (providers.length === 0) return null;

  const inactive = disabled || busy !== null;

  async function handlePress(provider: SocialProvider) {
    if (inactive) return;
    setBusy(provider);
    try {
      const blocked = beforeSignIn ? await beforeSignIn() : null;
      if (blocked) {
        onError(blocked);
        return;
      }
      const result = await signInWithProvider(provider, acceptanceMethod);
      if ("error" in result) {
        onError(result.error);
        return;
      }
      if ("ok" in result) await onSignedIn();
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.root}>
      {/* Sign-up screens have no room to spare above the bottom bar, so only
          sign-in sets the buttons further below the divider. */}
      <View
        style={[
          styles.dividerRow,
          acceptanceMethod === "sign_in_notice_social" && styles.dividerSpaced,
        ]}
      >
        <View style={styles.dividerLine} />
        <Text style={[Typography.caption, styles.dividerText]}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {providers.includes("apple") && (
        // Apple's guidelines require its own button, so this is the native
        // control rather than a Paper Button. It has no disabled prop.
        <View
          style={inactive && styles.inactive}
          pointerEvents={inactive ? "none" : "auto"}
        >
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={Radii.pill}
            style={styles.appleButton}
            onPress={() => handlePress("apple")}
          />
        </View>
      )}

      {providers.includes("google") && (
        <Button
          mode="outlined"
          onPress={() => handlePress("google")}
          disabled={inactive}
          loading={busy === "google"}
          icon={() => <GoogleLogo />}
          textColor={Colors.black}
          style={styles.googleButton}
          contentStyle={styles.googleContent}
        >
          Continue with Google
        </Button>
      )}

      {/* The sign-in screen has no acceptance checkbox, yet these buttons can
          create an account there, so the terms are stated before the tap. */}
      {acceptanceMethod === "sign_in_notice_social" && (
        <Text style={styles.notice}>
          New to BeGifted? Continuing with Apple or Google creates an account
          and means you agree to the{" "}
          <Text
            style={styles.noticeLink}
            onPress={() => void open(TERMS_OF_SERVICE_URL)}
            accessibilityRole="link"
          >
            Terms of Service
          </Text>{" "}
          and acknowledge the{" "}
          <Text
            style={styles.noticeLink}
            onPress={() => void open(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
          >
            Privacy Policy
          </Text>
          .
        </Text>
      )}

      <LinkFallbackSnackbar
        visible={failedUrl !== null}
        message="We couldn't open this document. Try copying the link instead."
        onCopyLink={copyFailedLink}
        onDismiss={dismiss}
      />
    </View>
  );
};

export default SocialSignInButtons;

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerSpaced: {
    marginBottom: Spacing.marginCompact,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.brand.mediumTeal,
  },
  dividerText: {
    color: Colors.brand.mediumTeal,
  },
  inactive: {
    opacity: 0.5,
  },
  appleButton: {
    height: BUTTON_HEIGHT,
    width: "100%",
  },
  googleButton: {
    borderRadius: Radii.pill,
    backgroundColor: Colors.white,
    borderColor: Colors.black,
  },
  googleContent: {
    height: BUTTON_HEIGHT,
  },
  notice: {
    ...Typography.caption,
    color: Colors.brand.darkTeal,
    textAlign: "center",
  },
  noticeLink: {
    ...Typography.caption,
    color: Colors.brand.darkTeal,
    textDecorationLine: "underline",
  },
});
