import { Pressable, StyleSheet } from "react-native";
import { Colors } from "../../lib/colors";
import ExpandCircleIcon from "../ExpandCircleIcon";

type GiftCardExpandButtonProps = {
  /** Whether the card is currently expanded. Controls chevron direction. */
  expanded: boolean;
  onPress: () => void;
};

export default function GiftCardExpandButton({
  expanded,
  onPress,
}: GiftCardExpandButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={expanded ? "Collapse gift" : "Expand gift"}
      style={styles.button}
    >
      {/* Design uses gold for both states; the affordance flips via a distinct
          up/down glyph, not a rotated icon. */}
      <ExpandCircleIcon
        direction={expanded ? "up" : "down"}
        color={Colors.brand.gold}
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
