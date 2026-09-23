import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";

/**
 * Placeholder for an active slot whose card the user removed, held until the
 * replacement finishes generating.
 *
 * The slot has to stay visibly empty. Closing the gap by sliding the next row
 * up is what made a Past Gift read as a fresh recommendation (DEV-488), and
 * generation takes minutes, so there is a real wait to account for.
 */
const PendingGiftCard: React.FC = () => (
  <View
    style={styles.row}
    accessibilityRole="progressbar"
    accessibilityLabel="Finding a new gift idea"
  >
    <Text style={styles.title}>Finding a new idea</Text>
    <ActivityIndicator size="small" color={Colors.brand.darkTeal} />
  </View>
);

export default PendingGiftCard;

const styles = StyleSheet.create({
  row: {
    // Matches CollapsedGiftCard so the held slot keeps the band's rhythm.
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    paddingVertical: 16.5,
    paddingLeft: 23,
    paddingRight: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    opacity: 0.6,
  },
  title: {
    ...Typography.h2,
    flex: 1,
    color: Colors.brand.darkTeal,
  },
});
