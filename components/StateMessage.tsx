import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";

type Props = {
  /** A finished sentence from `StateCopy`. */
  message: string;
};

/** A settled not-due, no-results or failed state standing in for a list. */
const StateMessage: React.FC<Props> = ({ message }) => (
  <View style={styles.root}>
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  // Same placement and face as the generating state, so switching between
  // the two doesn't move the copy.
  root: {
    alignItems: "center",
    paddingTop: 104,
  },
  message: {
    ...Typography.h2,
    color: Colors.brand.gold,
    textAlign: "center",
    maxWidth: 352,
  },
});

export default StateMessage;
