import { Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";

// TODO(DEV-48): wire visibility + tap handler to gift-feedback mechanism.
const VISIBLE = false;

export default function RecentMomentsLink() {
  if (!VISIBLE) return null;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Tell us how your recent moments went"
      style={styles.link}
    >
      <Text style={styles.text}>Tell us how your recent moments went</Text>
      <MaterialIcons
        name="chevron-right"
        size={16}
        color={Colors.yellows.gold}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 1,
  },
  text: {
    fontFamily: "RobotoFlex_400Regular",
    color: Colors.yellows.gold,
    fontSize: 13,
    fontWeight: "500",
  },
});
