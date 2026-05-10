import { Pressable, StyleSheet } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import type { Occasion } from "../../lib/api";

type OccasionOverflowButtonProps = {
  occasion: Occasion;
  tint?: string;
};

export default function OccasionOverflowButton({
  occasion,
  tint = Colors.darks.black,
}: OccasionOverflowButtonProps) {
  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    // TODO(DEV-70): open bottom-up drawer for this occasion
    console.log("[OccasionOverflow] open drawer for occasion", occasion.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Occasion options"
      style={styles.button}
    >
      <MaterialIcons name="more-horiz" size={22} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});
