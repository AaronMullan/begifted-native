import { Pressable, StyleSheet } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import type { GiftSuggestion } from "../../types/recipient";

type GiftCardActionButtonProps = {
  suggestion: GiftSuggestion;
  variant?: "expanded" | "collapsed";
};

export default function GiftCardActionButton({
  suggestion,
  variant = "expanded",
}: GiftCardActionButtonProps) {
  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    // TODO(DEV-70): open bottom-up drawer for this gift card
    console.log("[GiftCardAction] open drawer for gift", suggestion.id);
  };

  const iconName = variant === "expanded" ? "expand-more" : "chevron-right";

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Gift options"
      style={styles.button}
    >
      <MaterialIcons name={iconName} size={20} color={Colors.blues.dark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.blues.dark,
    alignItems: "center",
    justifyContent: "center",
  },
});
