import { Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";

type GiftCardExpandButtonProps = {
  /** Whether the card is currently expanded. Controls chevron direction. */
  expanded: boolean;
  onPress: () => void;
};

export default function GiftCardExpandButton({
  expanded,
  onPress,
}: GiftCardExpandButtonProps) {
  const iconName = expanded ? "expand-less" : "expand-more";
  const color = expanded ? Colors.blues.medium : Colors.yellows.gold;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={expanded ? "Collapse gift" : "Expand gift"}
      style={[styles.button, { borderColor: color }]}
    >
      <MaterialIcons name={iconName} size={20} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
