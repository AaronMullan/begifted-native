import { StyleSheet, View } from "react-native";
import { Checkbox, Text } from "react-native-paper";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";
import { useOpenLinkWithFallback } from "../hooks/use-open-link-with-fallback";
import { TERMS_OF_SERVICE_URL, PRIVACY_POLICY_URL } from "../lib/legal";
import LinkFallbackSnackbar from "./LinkFallbackSnackbar";

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
  const { open, failedUrl, copyFailedLink, dismiss } =
    useOpenLinkWithFallback();

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
            onPress={() => void open(TERMS_OF_SERVICE_URL)}
            accessibilityRole="link"
          >
            Terms of Service
          </Text>{" "}
          and acknowledge the{" "}
          <Text
            style={styles.link}
            onPress={() => void open(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>

      <LinkFallbackSnackbar
        visible={failedUrl !== null}
        message="We couldn't open this document. Try copying the link instead."
        onCopyLink={copyFailedLink}
        onDismiss={dismiss}
      />
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
