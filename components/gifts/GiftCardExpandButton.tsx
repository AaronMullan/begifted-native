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
  const color = expanded ? Colors.brand.mediumTeal : Colors.brand.gold;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={expanded ? "Collapse gift" : "Expand gift"}
      style={styles.button}
    >
      <MaterialIcons
        name="expand-circle-down"
        size={24}
        color={color}
        // The Figma asset is `expand_circle_down` for both states; rotate it to
        // read as a collapse affordance when the card is open.
        style={expanded ? styles.flipped : undefined}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  flipped: {
    transform: [{ rotate: "180deg" }],
  },
});
