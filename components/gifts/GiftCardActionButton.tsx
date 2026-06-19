import { Pressable, StyleSheet } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import type { GiftSuggestion } from "../../types/recipient";
import { useGiftActionDrawer } from "./GiftActionDrawerProvider";

type GiftCardActionButtonProps = {
  suggestion: GiftSuggestion;
  occasionId?: string | null;
};

export default function GiftCardActionButton({
  suggestion,
  occasionId,
}: GiftCardActionButtonProps) {
  const { openDrawer } = useGiftActionDrawer();

  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    openDrawer(suggestion, occasionId);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Gift options"
      style={styles.button}
    >
      <MaterialIcons
        name="more-horiz"
        size={22}
        color={Colors.brand.mediumTeal}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    // No padding: the tiny dots glyph centered in a padded box inflated the
    // card's top/bottom gaps around it. hitSlop preserves the tap target.
    padding: 0,
  },
});
