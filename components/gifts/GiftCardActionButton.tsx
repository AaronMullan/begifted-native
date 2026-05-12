import { Pressable, StyleSheet } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import type { GiftSuggestion } from "../../types/recipient";
import { useGiftActionDrawer } from "./GiftActionDrawerProvider";

type GiftCardActionButtonProps = {
  suggestion: GiftSuggestion;
  variant?: "expanded" | "collapsed";
  occasionId?: string | null;
};

export default function GiftCardActionButton({
  suggestion,
  variant = "expanded",
  occasionId,
}: GiftCardActionButtonProps) {
  const { openDrawer } = useGiftActionDrawer();

  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    openDrawer(suggestion, occasionId);
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
