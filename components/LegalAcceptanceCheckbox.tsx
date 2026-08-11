import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Checkbox, Snackbar, Text } from "react-native-paper";
import * as Clipboard from "expo-clipboard";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";
import { openLink } from "../lib/open-link";
import { TERMS_OF_SERVICE_URL, PRIVACY_POLICY_URL } from "../lib/legal";

type LegalAcceptanceCheckboxProps = {
  accepted: boolean;
  onToggle: (accepted: boolean) => void;
  disabled?: boolean;
};

/**
 * Clickwrap acceptance row for account creation: unchecked by default, both
 * document names open the hosted policies. Checkbox.Android is deliberate —
 * Paper's iOS checkbox renders nothing when unchecked, which hides the
 * affordance entirely on the platform where most signups happen.
 */
const LegalAcceptanceCheckbox: React.FC<LegalAcceptanceCheckboxProps> = ({
  accepted,
  onToggle,
  disabled = false,
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const openDocument = async (url: string) => {
    const opened = await openLink(url);
    if (!opened) setFailedUrl(url);
  };

  const handleCopyLink = async () => {
    if (!failedUrl) return;
    await Clipboard.setStringAsync(failedUrl);
    setFailedUrl(null);
  };

  return (
    <>
      <View style={styles.row}>
        <Checkbox.Android
          status={accepted ? "checked" : "unchecked"}
          onPress={() => onToggle(!accepted)}
          disabled={disabled}
          color={Colors.brand.darkTeal}
          uncheckedColor={Colors.brand.mediumTeal}
          accessibilityLabel="I agree to the Terms of Service and acknowledge the Privacy Policy"
        />
        <Text style={styles.label}>
          I agree to the{" "}
          <Text
            style={styles.link}
            onPress={() => void openDocument(TERMS_OF_SERVICE_URL)}
            accessibilityRole="link"
          >
            Terms of Service
          </Text>{" "}
          and acknowledge the{" "}
          <Text
            style={styles.link}
            onPress={() => void openDocument(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>

      <Snackbar
        visible={failedUrl !== null}
        onDismiss={() => setFailedUrl(null)}
        duration={6000}
        action={{ label: "Copy link", onPress: handleCopyLink }}
      >
        We couldn&apos;t open this document. Try copying the link instead.
      </Snackbar>
    </>
  );
};

export default LegalAcceptanceCheckbox;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  label: {
    ...Typography.copyblock,
    color: Colors.brand.darkTeal,
    flex: 1,
  },
  link: {
    ...Typography.copyblock,
    color: Colors.brand.darkTeal,
    textDecorationLine: "underline",
  },
});
