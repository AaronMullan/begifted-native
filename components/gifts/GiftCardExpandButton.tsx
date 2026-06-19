import { Pressable, StyleSheet } from "react-native";
import { Colors } from "../../lib/colors";
import ExpandCircleIcon from "../ExpandCircleIcon";

type GiftCardExpandButtonProps = {
  /** Whether the card is currently expanded. Controls chevron direction. */
  expanded: boolean;
  onPress: () => void;
  /** Chevron color. Gold for active recommendations; Past Gift rows use dark
   * teal to read as distinct from the active set (Figma V2). */
  color?: string;
};

export default function GiftCardExpandButton({
  expanded,
  onPress,
  color = Colors.brand.gold,
}: GiftCardExpandButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={expanded ? "Collapse gift" : "Expand gift"}
      style={styles.button}
    >
      {/* The affordance flips via a distinct up/down glyph, not a rotated icon. */}
      <ExpandCircleIcon
        direction={expanded ? "up" : "down"}
        color={color}
        size={24}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
});
