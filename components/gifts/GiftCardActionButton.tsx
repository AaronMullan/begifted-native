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

  const iconName = variant === "expanded" ? "expand-less" : "expand-more";
  const color =
    variant === "expanded" ? Colors.blues.medium : Colors.yellows.gold;

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Gift options"
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
