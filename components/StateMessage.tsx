import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { Colors } from "../lib/colors";
import { Spacing } from "../lib/spacing";
import { Typography } from "../lib/typography";

type Props = {
  /** A finished sentence from `StateCopy`. */
  message: string;
  /**
   * `hero` is the Gift Ideas treatment: large gold copy set well down the
   * page. `inline` sits inside a screen's own layout — loading screens, list
   * placeholders, failed loads.
   */
  size?: "hero" | "inline";
  /** Shows a spinner above the message — the in-progress family. */
  loading?: boolean;
  /** Offers "Try again" — pass it for any failed load that can be re-run. */
  onRetry?: () => void;
  retrying?: boolean;
};

/**
 * The one component every waiting, empty and error state renders through, so
 * a family looks the same wherever it appears. Copy comes from `StateCopy`.
 */
const StateMessage: React.FC<Props> = ({
  message,
  size = "inline",
  loading = false,
  onRetry,
  retrying = false,
}) => (
  <View style={size === "hero" ? styles.heroRoot : styles.inlineRoot}>
    {loading && (
      <ActivityIndicator
        size="large"
        color={Colors.black}
        style={styles.spinner}
      />
    )}
    <Text style={size === "hero" ? styles.heroMessage : styles.inlineMessage}>
      {message}
    </Text>
    {onRetry && (
      <Button
        mode="contained"
        onPress={onRetry}
        loading={retrying}
        disabled={retrying}
        buttonColor={Colors.brand.buttonTeal}
        textColor={Colors.white}
        style={styles.button}
      >
        Try again
      </Button>
    )}
  </View>
);

const styles = StyleSheet.create({
  // Same placement and face as the generating state, so switching between
  // the two doesn't move the copy.
  heroRoot: {
    alignItems: "center",
    paddingTop: 104,
  },
  heroMessage: {
    ...Typography.h2,
    color: Colors.brand.gold,
    textAlign: "center",
    maxWidth: 352,
  },
  // Intrinsic height, not `flex: 1` — mounted inside an auto-height parent (a
  // ScrollView's content view) a flex basis of 0 has no space to grow into and
  // collapses the whole state to nothing. Callers own vertical placement.
  inlineRoot: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.marginStandard,
    paddingHorizontal: Spacing.screenGutter,
  },
  inlineMessage: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
    textAlign: "center",
  },
  spinner: {
    marginBottom: Spacing.marginCompact,
  },
  button: {
    marginTop: Spacing.marginCompact,
  },
});

export default StateMessage;
