import { Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../lib/colors";
import { Radii, Typography } from "../lib/typography";

type AddMorePeopleButtonProps = {
  onPress: () => void;
  label?: string;
  accessibilityLabel?: string;
};

// Figma "Button / Add More People" (4588:4384): full-width mediumTeal bar,
// darkTeal plus, white largeCta label + chevron. The same standardized bar
// serves other add actions (e.g. "Add Moment") via the label prop.
const AddMorePeopleButton: React.FC<AddMorePeopleButtonProps> = ({
  onPress,
  label = "Add More People",
  accessibilityLabel = "Add more people",
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
  >
    <MaterialIcons name="add" size={16} color={Colors.brand.darkTeal} />
    <Text style={styles.label}>{label}</Text>
    <MaterialIcons name="chevron-right" size={14} color={Colors.white} />
  </Pressable>
);

export default AddMorePeopleButton;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.brand.mediumTeal,
    paddingHorizontal: 16,
    gap: 6,
  },
  rowPressed: {
    opacity: 0.8,
  },
  label: {
    ...Typography.largeCta,
    color: Colors.white,
  },
});
