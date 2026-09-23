import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { Colors } from "../lib/colors";
import { Spacing } from "../lib/spacing";
import { Typography } from "../lib/typography";

type Props = {
  /** Written as a finished sentence: "Couldn't load your people." */
  message: string;
  onRetry: () => void;
  retrying?: boolean;
};

/**
 * For a query that settled in error with no cached data behind it. A list
 * screen can otherwise only report "none", which reads as an answer rather
 * than a failure — so a returning user whose fetch failed lands on new-user
 * onboarding and a filled account looks empty.
 */
const LoadFailedState: React.FC<Props> = ({
  message,
  onRetry,
  retrying = false,
}) => (
  <View style={styles.root}>
    <Text style={styles.message}>{message}</Text>
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
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.screenGutter,
  },
  message: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
    textAlign: "center",
  },
  button: {
    marginTop: 20,
  },
});

export default LoadFailedState;
